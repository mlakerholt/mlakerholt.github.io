"""Small, auditable analysis and coverage tools. Example thresholds are not universal."""
from __future__ import annotations
import argparse
import csv
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, stdev


def read_csv(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fields=None):
    fields = fields or list(rows[0])
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def fit_line(times, values):
    if len(times) < 3 or len(set(times)) != len(times):
        raise ValueError('A fit needs at least three distinct times.')
    if not all(math.isfinite(x) for x in times + values):
        raise ValueError('Non-finite measurement.')
    xbar, ybar = mean(times), mean(values)
    ssx = sum((x-xbar)**2 for x in times)
    slope = sum((x-xbar)*(y-ybar) for x, y in zip(times, values))/ssx
    residuals = [y-(ybar+slope*(x-xbar)) for x,y in zip(times,values)]
    ssy = sum((y-ybar)**2 for y in values)
    r2 = 1-sum(e*e for e in residuals)/ssy if ssy else 0.0
    return slope, r2


def coverage(probabilities, draws):
    """Exact expected coverage and rigorous bounds under IID draws with replacement.

    Missing probability mass represents clones outside the target set. Bounds do
    not assume independence between the events of observing different variants.
    """
    if isinstance(draws, bool) or not isinstance(draws, int) or draws < 0:
        raise ValueError('Draws must be a nonnegative integer.')
    if not probabilities or any(not math.isfinite(p) or p < 0 or p > 1 for p in probabilities):
        raise ValueError('Probabilities must be finite and between zero and one.')
    if sum(probabilities) > 1 + 1e-10:
        raise ValueError('Target probabilities cannot sum above one.')
    seen = [1-(1-p)**draws for p in probabilities]
    missing = sum(1-s for s in seen)
    return {'draws':draws, 'target_variants':len(seen),
            'expected_distinct':sum(seen), 'expected_fraction':mean(seen),
            'probability_all_lower_bound':max(0, 1-missing),
            'probability_all_upper_bound':min(seen)}


def load_inputs(folder, cfg):
    records = read_csv(folder/'plate_map.csv')
    register = read_csv(folder/'clone_register.csv')
    ids = [r['clone_id'] for r in register]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate clone ID in register.')
    locations = {r['clone_id']:r['stock_location'] for r in register}
    mapping = {}
    replicate_ids = set()
    valid_wells = {f'{r}{c:02d}' for r in 'ABCDEFGH' for c in range(1,13)}
    for row in records:
        key = (row['plate_id'], row['well'])
        if key in mapping:
            raise ValueError(f'Duplicate plate/well: {key}')
        if row['well'] not in valid_wells:
            raise ValueError(f'Invalid 96-well coordinate: {key}')
        if row['sample_type'] not in ('parent', 'blank', 'host', 'candidate'):
            raise ValueError('Unrecognized sample_type.')
        if row['sample_type'] in ('parent','candidate'):
            if row['clone_id'] not in locations or not locations[row['clone_id']].strip():
                raise ValueError(f'Missing recoverable stock for {key}')
            if not row['prep_id'].strip():
                raise ValueError(f'Missing preparation ID for {key}')
            repkey = (row['plate_id'], row['clone_id'], row['prep_id'], row['technical_rep'])
            if not row['technical_rep'].strip() or repkey in replicate_ids:
                raise ValueError(f'Missing or duplicate technical replicate ID: {key}')
            replicate_ids.add(repkey)
        if row['assay_id'] != cfg['assay_id']:
            raise ValueError('Assay ID mismatch.')
        row['stock_location'] = locations.get(row['clone_id'], '')
        mapping[key] = row
    observations = defaultdict(list)
    seen = set()
    for row in read_csv(folder/'measurements.csv'):
        key = (row['plate_id'], row['well'])
        if key not in mapping:
            raise ValueError(f'Unmapped observation: {key}')
        if row['run_id'] != cfg['run_id'] or row['signal_unit'] != cfg['signal_unit']:
            raise ValueError('Run or unit mismatch.')
        t, y = float(row['time_s']), float(row['signal'])
        if not math.isfinite(t) or not math.isfinite(y) or t < 0:
            raise ValueError('Non-finite or negative-time measurement.')
        obskey = (*key,t)
        if obskey in seen:
            raise ValueError(f'Duplicate observation: {obskey}')
        seen.add(obskey)
        observations[key].append((t,y))
    if not mapping:
        raise ValueError('Empty plate map.')
    return mapping, observations


def analyze(folder, output, make_plots=True):
    folder, output = Path(folder), Path(output)
    if output.resolve() == folder.resolve():
        raise ValueError('Output must be separate from input.')
    cfg = json.loads((folder/'assay.json').read_text(encoding='utf-8'))
    if cfg['signal_direction'] not in (-1,1):
        raise ValueError('Signal direction must be +1 or -1.')
    times = cfg['fit_times_s']
    if len(times)<3 or len(set(times))!=len(times) or any(t<0 for t in times):
        raise ValueError('Specify at least three unique, nonnegative fit times.')
    for name in ('minimum_r2','maximum_parent_cv','maximum_technical_cv','maximum_host_fraction'):
        if not 0 <= cfg[name] <= 1:
            raise ValueError(f'Invalid threshold: {name}')
    if cfg['minimum_fold_for_retest']<=1 or cfg['signal_ceiling']<=0:
        raise ValueError('Invalid fold threshold or signal ceiling.')
    mapping, obs = load_inputs(folder,cfg)
    results = []
    for key,row in mapping.items():
        selected = sorted((t,y) for t,y in obs[key] if t in times)
        flags = []
        slope, r2 = None,None
        if [t for t,y in selected] != sorted(times):
            flags.append('missing_timepoints')
        else:
            slope,r2 = fit_line([t/60 for t,y in selected],[y for t,y in selected])
            if any(y >= cfg['signal_ceiling'] for t,y in selected):
                flags.append('signal_at_or_above_ceiling')
            if row['sample_type'] in ('candidate','parent') and r2 < cfg['minimum_r2']:
                flags.append('nonlinear_or_low_signal')
        results.append({**row,'raw_slope_per_min':slope,'r2':r2,'corrected_rate_per_min':None,'flags':flags})

    plates = defaultdict(list)
    for r in results:
        plates[r['plate_id']].append(r)
    quality = {}
    candidates = []
    for plate,rows in plates.items():
        reasons=[]
        blanks=[r['raw_slope_per_min'] for r in rows if r['sample_type']=='blank' and not r['flags']]
        if len(blanks)<cfg['minimum_blank_wells']:
            reasons.append('insufficient_valid_blanks')
        if any(r['flags'] for r in rows if r['sample_type'] in ('parent','blank','host')):
            reasons.append('failed_control_measurement')
        background=mean(blanks) if blanks else None
        for r in rows:
            if r['raw_slope_per_min'] is not None and background is not None:
                r['corrected_rate_per_min']=(r['raw_slope_per_min']-background)*cfg['signal_direction']
        preps=defaultdict(list)
        for r in rows:
            if r['sample_type']=='parent': preps[r['prep_id']].append(r)
        parent_means=[]
        for prep, rr in preps.items():
            vals=[r['corrected_rate_per_min'] for r in rr if not r['flags'] and r['corrected_rate_per_min'] is not None]
            if len(vals)<cfg['minimum_technical_wells']:
                reasons.append('incomplete_parent_preparation')
            elif mean(vals)<=0 or (stdev(vals)/mean(vals) if len(vals)>1 else 0)>cfg['maximum_technical_cv']:
                reasons.append('unstable_parent_preparation')
            else: parent_means.append(mean(vals))
        if len(parent_means)<cfg['minimum_parent_preparations']:
            reasons.append('insufficient_parent_preparations')
        parent_mean=mean(parent_means) if parent_means else None
        parent_cv=stdev(parent_means)/parent_mean if len(parent_means)>1 and parent_mean>0 else None
        if parent_cv is None or parent_cv>cfg['maximum_parent_cv']:
            reasons.append('parent_variation_exceeds_rule')
        hosts=[r['corrected_rate_per_min'] for r in rows if r['sample_type']=='host' and not r['flags'] and r['corrected_rate_per_min'] is not None]
        host_mean=mean(hosts) if hosts else None
        if len(hosts)<cfg['minimum_host_wells']:
            reasons.append('insufficient_valid_host_controls')
        if host_mean is not None and parent_mean is not None and host_mean>cfg['maximum_host_fraction']*parent_mean:
            reasons.append('host_background_exceeds_rule')
        zprime=None
        if len(parent_means)>1 and len(hosts)>1 and parent_mean != host_mean:
            zprime=1-3*(stdev(parent_means)+stdev(hosts))/abs(parent_mean-host_mean)
        quality[plate]={'usable':not reasons,'reasons':sorted(set(reasons)),
                        'blank_slope_per_min':background,'parent_rate_per_min':parent_mean,
                        'parent_prep_count':len(parent_means),'parent_cv':parent_cv,
                        'host_rate_per_min':host_mean,'zprime_descriptive':zprime}
        groups=defaultdict(list)
        for r in rows:
            if r['sample_type']=='candidate': groups[r['clone_id']].append(r)
        for clone,rr in groups.items():
            flags=set(f for r in rr for f in r['flags'])
            prepids={r['prep_id'] for r in rr}
            if len(prepids)!=1:
                raise ValueError('Demo primary screen expects one preparation per candidate per plate. Analyze confirmation separately.')
            rates=[r['corrected_rate_per_min'] for r in rr if r['corrected_rate_per_min'] is not None and not r['flags']]
            if len(rates)<cfg['minimum_technical_wells']: flags.add('insufficient_valid_technical_wells')
            rate=mean(rates) if rates else None
            cv=stdev(rates)/abs(rate) if len(rates)>1 and rate else None
            if rate is not None and rate<=0: flags.add('nonpositive_rate')
            if cv is not None and cv>cfg['maximum_technical_cv']: flags.add('technical_disagreement')
            if reasons: flags.add('plate_requires_review')
            fold=rate/parent_mean if rate is not None and parent_mean and not flags else None
            decision=('review_measurement' if flags else 'retest_candidate' if fold>=cfg['minimum_fold_for_retest'] else 'below_retest_threshold')
            candidates.append({'plate_id':plate,'clone_id':clone,'prep_id':next(iter(prepids)),
                               'valid_wells':len(rates),'rate_per_min':rate,'technical_cv':cv,'fold_vs_parent':fold,
                               'decision':decision,'flags':';'.join(sorted(flags)),
                               'stock_location':rr[0]['stock_location']})
    candidates.sort(key=lambda r: (r['fold_vs_parent'] is None,-(r['fold_vs_parent'] or 0),r['clone_id']))
    output.mkdir(parents=True,exist_ok=True)
    write_csv(output/'well_results.csv',[{**r,'flags':';'.join(r['flags'])} for r in results])
    write_csv(output/'candidates.csv',candidates,fields=['plate_id','clone_id','prep_id','valid_wells','rate_per_min','technical_cv','fold_vs_parent','decision','flags','stock_location'])
    (output/'quality.json').write_text(json.dumps({'data_origin':cfg['data_origin'],'config':cfg,'plates':quality},indent=2),encoding='utf-8')
    lines=['# Example screening report','',f"Data origin: **{cfg['data_origin']}**.",'',
           'Retest labels nominate measurements for independent confirmation. They do not establish improved enzymes.','',
           '| Plate | Usable | Parent preparations | Parent CV | Reasons |','| --- | --- | --- | --- | --- |']
    for plate,q in quality.items():
        cv=f"{q['parent_cv']:.1%}" if q['parent_cv'] is not None else 'unavailable'
        lines.append(f"| {plate} | {q['usable']} | {q['parent_prep_count']} | {cv} | {', '.join(q['reasons']) or 'None under example rules'} |")
    lines+=['','## Candidates for independent retesting','']
    for r in candidates:
        if r['decision']=='retest_candidate':
            lines.append(f"- {r['clone_id']}: {r['fold_vs_parent']:.3f} × parent; stock {r['stock_location']}.")
    lines+=['','## Measurements requiring review','']
    for r in candidates:
        if r['flags']: lines.append(f"- {r['clone_id']}: {r['flags']}.")
    lines+=['','Rates are blank-corrected signal units per minute. There is no protein-amount normalization or kinetic-constant estimation.',
            'Z-prime is descriptive here and uses preparation means for parents versus host-control wells. It is not a hit threshold.',
            'Inspect traces and plate patterns even when numerical rules pass. Thresholds are illustrative and need assay-specific validation.']
    if make_plots:
        for name in plot_example(results,obs,output,cfg,candidates):
            lines+=['',f'![Quality plots]({name})']
    (output/'report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    return candidates,quality


def plot_example(results,obs,output,cfg,candidates):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    plate_ids=sorted({r['plate_id'] for r in results})
    filenames=[]
    for plate_index,plate in enumerate(plate_ids,1):
        rows=[r for r in results if r['plate_id']==plate]
        fig,axs=plt.subplots(1,3,figsize=(15,4.5),layout='constrained')
        grid=np.full((8,12),np.nan)
        for r in rows:
            if r['corrected_rate_per_min'] is not None and not r['flags']:
                grid['ABCDEFGH'.index(r['well'][0]),int(r['well'][1:])-1]=r['corrected_rate_per_min']
        im=axs[0].imshow(grid,cmap='viridis',aspect='auto')
        axs[0].set(xticks=range(12),xticklabels=range(1,13),yticks=range(8),yticklabels=list('ABCDEFGH'),title='Corrected rates (masked if flagged)')
        fig.colorbar(im,ax=axs[0],label=f"{cfg['signal_unit']} / min")
        for label in ('parent','blank','host'):
            vals=[r['corrected_rate_per_min'] for r in rows if r['sample_type']==label and r['corrected_rate_per_min'] is not None]
            axs[1].scatter([label]*len(vals),vals,alpha=.6)
        axs[1].set(title='Control wells',ylabel=f"{cfg['signal_unit']} / min")
        plate_candidates=[r for r in candidates if r['plate_id']==plate]
        promising=[r['clone_id'] for r in plate_candidates if r['decision']=='retest_candidate'][:2]
        suspect=[r['clone_id'] for r in plate_candidates if r['flags']][:3]
        selected=list(dict.fromkeys(promising+suspect)) or [r['clone_id'] for r in plate_candidates[:4]]
        for color_index,clone in enumerate(selected):
            for i,r in enumerate([r for r in rows if r['clone_id']==clone]):
                pts=sorted(obs[(plate,r['well'])])
                axs[2].plot([t/60 for t,y in pts],[y for t,y in pts],color=f'C{color_index}',label=clone if i==0 else None,alpha=.75,linestyle='-' if i==0 else '--')
        axs[2].set(title='Inspect promising and suspect traces',xlabel='Time (min)',ylabel=cfg['signal_unit'])
        if selected: axs[2].legend(fontsize=8)
        fig.suptitle(f"{plate} — {cfg['data_origin']}",fontsize=10)
        name='quality_plots.png' if len(plate_ids)==1 else f'quality_plate_{plate_index:02d}.png'
        fig.savefig(output/name,dpi=160)
        plt.close(fig)
        filenames.append(name)
    return filenames


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    subs=parser.add_subparsers(dest='command',required=True)
    a=subs.add_parser('analyze'); a.add_argument('--input',type=Path,required=True); a.add_argument('--output',type=Path,required=True); a.add_argument('--no-plots',action='store_true')
    c=subs.add_parser('coverage'); c.add_argument('--probabilities',type=Path,required=True); c.add_argument('--draws',type=int,required=True)
    args=parser.parse_args()
    if args.command=='analyze':
        candidates,quality=analyze(args.input,args.output,not args.no_plots)
        print(json.dumps({'plates':len(quality),'retest_candidates':[r['clone_id'] for r in candidates if r['decision']=='retest_candidate'],'output':str(args.output)},indent=2))
    else:
        rows=read_csv(args.probabilities)
        if len({r['variant_id'] for r in rows})!=len(rows): raise ValueError('Duplicate variant ID.')
        print(json.dumps(coverage([float(r['probability_per_draw']) for r in rows],args.draws),indent=2))


if __name__=='__main__':
    main()

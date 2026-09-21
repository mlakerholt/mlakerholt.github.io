"""Render the reviewed model from audited-sheets.json. Does not rewrite app code.
Run node sources/audit-vessels.cjs first after changing audit rules.
"""
import json, hashlib, shutil, html, unicodedata, sys
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'pdfs'
BACKUP=ROOT/'audit-baseline'/'pdfs'
OUT.mkdir(exist_ok=True); BACKUP.mkdir(parents=True,exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Cell',fontName='Helvetica',fontSize=8,leading=11,spaceAfter=3))
styles.add(ParagraphStyle(name='SmallNote',fontName='Helvetica',fontSize=8,leading=11,spaceAfter=6,textColor=colors.HexColor('#42544b')))
styles['Title'].fontSize=19; styles['Title'].leading=24; styles['Title'].textColor=colors.HexColor('#164d36')
styles['Heading2'].fontSize=12;styles['Heading2'].leading=16;styles['Heading2'].spaceBefore=14
def esc(value):
    text=str(value).replace('µ','u').replace('π','pi').replace('∛','cuberoot').replace('×',' x ').replace('÷',' / ').replace('→',' -> ').replace('≥',' >= ').replace('ᵢ','i')
    for char in ['—','–','‑']: text=text.replace(char,'-')
    return html.escape(unicodedata.normalize('NFKD',text).encode('ascii','ignore').decode())
def p(s,style='Cell'): return Paragraph(esc(s).replace('\n','<br/>'),styles[style])
def footer(canvas,doc):
    canvas.setStrokeColor(colors.HexColor('#c3d5c8'));canvas.line(40,38,555,38)
    canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#42544b'))
    canvas.drawString(40,26,'Local simulator derivation sheet - not a manufacturer publication - reviewed 2026-09-11')
    canvas.drawRightString(555,26,f'Page {doc.page}')

selected=set(sys.argv[1:])
previous=json.loads((OUT/'manifest.json').read_text(encoding='utf8')) if (OUT/'manifest.json').exists() else []
manifest=[m for m in previous if m['id'] not in selected] if selected else []
built=0
for r in json.loads((ROOT/'audited-sheets.json').read_text(encoding='utf8')):
    if selected and r['id'] not in selected: continue
    target=OUT/(r['id']+'.pdf')
    old=BACKUP/target.name
    if target.exists() and not old.exists():shutil.copy2(target,old)
    story=[p(r['label'],'Title'),p(r['id'],'SmallNote'),p(r['status'],'Heading2'),
        p('Each field is classified independently. Direct manufacturer values take precedence over estimates only for the matching model and configuration. Approximate values printed by the manufacturer remain approximate. Unverified fields are editable simulation assumptions, not equipment operating limits.','SmallNote')]
    rows=[[p('Parameter'),p('Value in simulator'),p('Evidence status')]]
    for field in r['parameters']:rows.append([p(field['label']),p(field['value']),p(field['status'])])
    table=Table(rows,colWidths=[230,160,125],repeatRows=1,hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dcebe1')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.3,colors.HexColor('#c9d4cc')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    story.append(table)
    story.extend([PageBreak(),p('Parameter evidence and derivations','Heading2')])
    for field in r['parameters']:
        e=field['explanation']
        block=[p(field['label']+' - '+field['value'],'Heading2'),p(field['status']+' | '+e['origin'])]
        block.extend([p('Rule: '+str(e.get('rule',''))),p('Selection / calculation: '+str(e.get('calculation',''))),p('Limitations: '+str(e.get('rationale','')))])
        for c in e.get('citations',[]):
            if c.get('file'):
                local='../originals/'+c['file']+('#page='+str(c['page']) if c.get('page') else '')
                locator=f' - PDF page {c["page"]}' if c.get('page') else (' - screenshot excerpt; page unknown' if c['file'].endswith('.png') else ' - raw HTML')
                block.append(Paragraph(f'<link href="{html.escape(local,quote=True)}" color="#16583b">Local original: {esc(c["title"])}{locator}</link>',styles['Cell']))
            else:block.append(p('Original unavailable locally; primary evidence observed online.'))
            if c.get('url'):
                link_label='Third-party document listing (Scribd)' if 'scribd.com' in c['url'] else 'Manufacturer publication'
                block.append(Paragraph(f'<link href="{html.escape(c["url"],quote=True)}" color="#16583b">{link_label}</link>',styles['Cell']))
        story.append(KeepTogether(block))
    story.append(p('Configuration notes and unresolved evidence','Heading2'))
    for note in r['notes']:story.append(p(note,'SmallNote'))
    for source in r.get('supplementalSources',[]):
        story.append(Paragraph(f'<link href="../originals/{html.escape(source["file"],quote=True)}#page={source["page"]}" color="#16583b">Supplementary archived source: {esc(source["title"])} - PDF page {source["page"]}</link>',styles['Cell']))
        story.append(p(source['scope'],'SmallNote'))
    referenced={e['document']['file']:e['document'] for e in r.get('evidence',{}).values() if (e.get('document') or {}).get('file')}
    for source in r.get('supplementalSources',[]):referenced[source['file']]=source
    if r.get('ratioCitation'):referenced[r['ratioCitation']['file']]=r['ratioCitation']
    if referenced:
        story.append(p('Local original document identities','Heading2'))
        for d in referenced.values():
            story.append(KeepTogether([p(d['title']),p(d['file'],'SmallNote'),p('SHA-256: '+d['sha256'],'SmallNote')]))
    SimpleDocTemplate(str(target),pagesize=(595,842),leftMargin=40,rightMargin=40,topMargin=40,bottomMargin=53,title=r['label'],author='Fermentation Simulator - local evidence audit').build(story,onFirstPage=footer,onLaterPages=footer)
    reader=PdfReader(target)
    text='\n'.join(page.extract_text() or '' for page in reader.pages)
    if 'Parameter evidence and derivations' not in text or len(reader.pages)<2:raise RuntimeError('Incomplete PDF '+r['id'])
    manifest.append(dict(id=r['id'],label=r['label'],manufacturer=r['manufacturer'],file=target.name,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),pages=len(reader.pages),auditDate='2026-09-11'))
    built+=1
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
print(f'Built and parsed {built} sheets; manifest contains {len(manifest)} sheets.')

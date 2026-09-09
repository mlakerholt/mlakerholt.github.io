import {parseCSV,toCSV} from './io.mjs';

export const SEQUENCE_DATA_VERSION=1;
export const sequenceProfiles={
  nucb:{
    name:'NucB activity landscape',
    description:'Categorical nuclease activity across four generations and multiple library-design routes.',
    sourceUrl:'https://github.com/google-deepmind/nuclease_design',
    publicationUrl:'https://doi.org/10.1101/2024.03.21.585615',
    metric:'Catalytic activity class',unit:'activity class',reference:'NucB wild type'
  },
  pcired:{
    name:'PcIRED–tecalcet fitness landscape',
    description:'Sequence-linked log-enrichment fitness at 20 h and 40 h, including uncertainty and replicate counts.',
    sourceUrl:'https://zenodo.org/records/14544486',
    publicationUrl:'https://doi.org/10.1101/2024.04.08.588565',
    metric:'Log-enrichment fitness',unit:'log enrichment vs wild type',reference:'PcIRED wild type'
  }
};

const missing=value=>value===undefined||value===null||['','#NAME?','NA','N/A','NAN','NULL'].includes(String(value).trim().toUpperCase());
function numeric(value,field,line){if(missing(value))return null;const n=Number(value);if(!Number.isFinite(n))throw new Error(`Row ${line}: ${field} must be numeric or blank.`);return n;}
function bool(value){if(missing(value))return null;const v=String(value).trim().toLowerCase();if(['true','1','yes'].includes(v))return true;if(['false','0','no'].includes(v))return false;return null;}
function list(value){const text=String(value||'').trim();if(!text)return[];const quoted=[...text.matchAll(/['"]([^'"]+)['"]/g)].map(m=>m[1]);return quoted.length?quoted:text.replace(/[()[\]]/g,'').split(/[,;|]/).map(x=>x.trim()).filter(Boolean);}
function mutationList(value){const text=String(value||'').trim(),triples=[...text.matchAll(/\(['"]([A-Z*])['"]\s*,\s*(\d+)\s*,\s*['"]([A-Z*])['"]\)/gi)].map(m=>`${m[1].toUpperCase()}${m[2]}${m[3].toUpperCase()}`);return triples.length?triples:(text&&text!=='()'?[text]:[]);}
function stableId(profile,sequence){let first=2166136261,second=5381;for(const char of `${profile}:${sequence}`){const code=char.charCodeAt(0);first^=code;first=Math.imul(first,16777619);second=(Math.imul(second,33)^code)>>>0;}return `${profile}-${(first>>>0).toString(16).padStart(8,'0')}${second.toString(16).padStart(8,'0')}`;}
function validSequence(sequence,line){const s=String(sequence||'').trim().toUpperCase();if(!s)throw new Error(`Row ${line}: amino-acid sequence is missing.`);if(!/^[ACDEFGHIKLMNPQRSTVWY*]+$/.test(s))throw new Error(`Row ${line}: amino-acid sequence contains unsupported symbols.`);return s;}

export function detectSequenceProfile(headers){
  const keys=new Set(headers);
  if(['mutations','generations','activity_level','is_functional','sequence'].every(k=>keys.has(k)))return'nucb';
  if(['variant','aa_seq','hamming_to_wildtype','fitness_avg'].every(k=>keys.has(k)))return'pcired';
  throw new Error('This is not a recognized NucB or PcIRED sequence–fitness file.');
}

function nucbVariant(row){
  const sequence=validSequence(row.sequence,row._line),mutationCount=numeric(row.num_mutations,'num_mutations',row._line);
  const mutations=mutationList(row.mutations);return{id:stableId('nucb',sequence),label:mutationCount===0?'WT':mutations.join(', ')||String(row.mutations||'').trim(),sequence,mutations,mutationCount,generations:list(row.generations),libraries:list(row.sublibrary_names),functional:bool(row.is_functional),activityClass:String(row.activity_level||'').trim()||null,metrics:{activity_class:String(row.activity_level||'').trim()||null},counts:[],agreement:null};
}
function pciredVariant(row){
  const sequence=validSequence(row.aa_seq,row._line),label=String(row.variant||'').trim()||'WT',counts=[];
  for(const condition of ['20h','40h'])for(let replicate=1;replicate<=3;replicate++){
    const input=numeric(row[`count_r${replicate}_in_${condition}`],`count_r${replicate}_in_${condition}`,row._line),output=numeric(row[`count_r${replicate}_out_${condition}`],`count_r${replicate}_out_${condition}`,row._line);
    if(input!==null||output!==null)counts.push({condition,replicate,input,output,fitness:numeric(row[`fitness_r${replicate}_uncorr_${condition}`],`fitness_r${replicate}_uncorr_${condition}`,row._line),sigma:numeric(row[`sigma_r${replicate}_uncorr_${condition}`],`sigma_r${replicate}_uncorr_${condition}`,row._line)});
  }
  return{id:stableId('pcired',sequence),label,sequence,mutations:label==='WT'?[]:label.split(/[:;,]+/).filter(Boolean),mutationCount:numeric(row.hamming_to_wildtype,'hamming_to_wildtype',row._line),generations:[],libraries:['whole-gene mutagenesis'],functional:null,activityClass:null,metrics:{fitness_avg:numeric(row.fitness_avg,'fitness_avg',row._line),fitness_20h:numeric(row.fitness_20h,'fitness_20h',row._line),sigma_20h:numeric(row.sigma_20h,'sigma_20h',row._line),percentile_20h:numeric(row.fitness_percentile_20h,'fitness_percentile_20h',row._line),fitness_40h:numeric(row.fitness_40h,'fitness_40h',row._line),sigma_40h:numeric(row.sigma_40h,'sigma_40h',row._line),percentile_40h:numeric(row.fitness_percentile_40h,'fitness_percentile_40h',row._line)},counts,agreement:{bothTimepoints:bool(row.positive_all_replicates_both_timepoints),atLeast2:bool(row.positive_at_least_2_replicates_agreeing),atLeast3:bool(row.positive_at_least_3_replicates_agreeing),atLeast4:bool(row.positive_at_least_4_replicates_agreeing)}};
}

export function parseSequenceDataset(text,name='sequence-fitness.csv'){
  const prepared=String(text).replace(/^\uFEFF?,(?=mutations,)/,'row_index,'),rows=parseCSV(prepared,name),headers=Object.keys(rows[0]||{}).filter(k=>k!=='_line'),profile=detectSequenceProfile(headers),variants=rows.map(profile==='nucb'?nucbVariant:pciredVariant),ids=new Set(),sequences=new Set();
  for(const variant of variants){if(sequences.has(variant.sequence))throw new Error(`Duplicate amino-acid sequence: ${variant.label}.`);if(ids.has(variant.id))throw new Error('Variant identifier collision; the dataset was not imported.');sequences.add(variant.sequence);ids.add(variant.id);}
  const p=sequenceProfiles[profile],numericValues=variants.map(v=>v.metrics.fitness_avg).filter(Number.isFinite);
  return{version:SEQUENCE_DATA_VERSION,id:`${profile}-${Date.now()}`,profile,name,title:p.name,description:p.description,sourceUrl:p.sourceUrl,publicationUrl:p.publicationUrl,metric:p.metric,unit:p.unit,reference:p.reference,importedAt:new Date().toISOString(),variants,summary:{variants:variants.length,functional:variants.filter(v=>v.functional===true).length,nonfunctional:variants.filter(v=>v.functional===false).length,withFitness:numericValues.length,minFitness:numericValues.length?Math.min(...numericValues):null,maxFitness:numericValues.length?Math.max(...numericValues):null}};
}

export function sequenceMetricOptions(dataset){return dataset.profile==='nucb'?[['activity_class','Activity class']]:[['fitness_avg','Average fitness'],['fitness_20h','Fitness · 20 h'],['fitness_40h','Fitness · 40 h'],['percentile_20h','Percentile · 20 h'],['percentile_40h','Percentile · 40 h']];}
export function normalizedSequenceCSV(dataset){
  const rows=dataset.variants.map(v=>({variant_id:v.id,label:v.label,aa_sequence:v.sequence,mutation_count:v.mutationCount,generations:v.generations.join(';'),library_origins:v.libraries.join(';'),functional:v.functional,activity_class:v.activityClass,fitness_avg:v.metrics.fitness_avg,fitness_20h:v.metrics.fitness_20h,sigma_20h:v.metrics.sigma_20h,fitness_40h:v.metrics.fitness_40h,sigma_40h:v.metrics.sigma_40h}));
  return toCSV(rows,['variant_id','label','aa_sequence','mutation_count','generations','library_origins','functional','activity_class','fitness_avg','fitness_20h','sigma_20h','fitness_40h','sigma_40h']);
}

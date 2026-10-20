import type {DimensionId} from '@el-dabboos/domain';
/** Closed calendar vocabulary. Column expressions are adapter-owned, never query input. */
export function calendarValueSql(dimension:DimensionId,column:string):string {
 if(dimension==='week')return `to_char(${column}-((extract(dow from ${column})::int+1)%7),'YYYY-MM-DD')`;
 const formats={date:'YYYY-MM-DD',month:'YYYY-MM',quarter:'YYYY-"Q"Q',year:'YYYY'};
 if(!Object.hasOwn(formats,dimension))throw new Error('Unsupported SQL calendar dimension');
 return `to_char(${column},'${formats[dimension as keyof typeof formats]}')`;
}

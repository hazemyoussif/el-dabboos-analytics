/** Reusing a sealed API input does not advance its source observation. */
export function sameObservedOdooInput(previous:{cutoff:string;revision:string},next:{cutoff:string;revision:string}){
 return next.revision.startsWith('orm-observed-copy-v1:')&&next.revision===previous.revision&&Date.parse(next.cutoff)===Date.parse(previous.cutoff);
}

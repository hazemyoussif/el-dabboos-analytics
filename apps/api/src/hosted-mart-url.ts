export function assertHostedMartUrl(value:string|undefined,environment:Readonly<Record<string,string|undefined>>,message:string): string {
  if (!value) throw new Error(message);
  const host=new URL(value).hostname;
  const local=['localhost','127.0.0.1','[::1]'].includes(host);
  const hostedStaging=environment.ENVIRONMENT==='staging' && host==='postgres';
  if(!local && !hostedStaging) throw new Error(message);
  return value;
}

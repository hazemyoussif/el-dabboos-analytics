import {historicalJobOptions} from './historical-job-options.ts';
import {assertHostedMartUrl} from './hosted-mart-url.ts';

/** Topology is explicit; two-mart transfer remains the default for existing operators. */
export function historicalPublicationOptions(args:readonly string[],env:Record<string,string|undefined>) {
  const inPlace=args.filter(argument=>argument==='--in-place').length;
  if (inPlace>1) throw new Error('Duplicate historical publication mode');
  const job=historicalJobOptions(args.filter(argument=>argument!=='--in-place'));
  if (!env.MART_MIGRATOR_URL || !inPlace && !env.MART_PUBLICATION_TARGET_URL) throw new Error('Explicit publication mart configuration required');
  if (inPlace) assertHostedMartUrl(env.MART_MIGRATOR_URL,env,'In-place publication requires local or hosted staging configuration');
  if (!inPlace && env.MART_MIGRATOR_URL===env.MART_PUBLICATION_TARGET_URL) throw new Error('Single-mart publication requires --in-place');
  return {...job,inPlace:!!inPlace,sourceUrl:env.MART_MIGRATOR_URL,targetUrl:inPlace?env.MART_MIGRATOR_URL:env.MART_PUBLICATION_TARGET_URL!};
}

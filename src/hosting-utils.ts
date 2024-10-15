export const HostingUrl =
  process.env.HOSTING_URL ||
  getFullFqdnIfDefined(process.env.VERCEL_PROJECT_PRODUCTION_URL) || // https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL_PROJECT_PRODUCTION_URL
  getFullFqdnIfDefined(process.env.VERCEL_URL) || // https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL_URL
  '';

function getFullFqdnIfDefined(domain: string | undefined) {
  return domain ? `https://${domain}` : undefined;
}

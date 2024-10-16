declare global {
  const Netlify: {
    env: {
      get(name: string): string;
    };
  };
}

export const HostingUrl =
  getEnvVar('HOSTING_URL') ||
  getEnvVar('URL') ||
  getFullFqdnIfDefined(getEnvVar('VERCEL_PROJECT_PRODUCTION_URL')) || // https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL_PROJECT_PRODUCTION_URL
  getFullFqdnIfDefined(getEnvVar('VERCEL_URL')) || // https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL_URL
  '';

function getFullFqdnIfDefined(domain: string | undefined) {
  return domain ? `https://${domain}` : undefined;
}

function getEnvVar(varName: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[varName];
  }

  if (typeof Netlify !== 'undefined' && Netlify.env) {
    return Netlify.env.get(varName);
  }

  return undefined;
}

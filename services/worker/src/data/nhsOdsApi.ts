import type { Practice } from '@gpnow/types';

const ODS_BASE_URL = 'https://directory.spineservices.nhs.uk/STU3/Organization';

interface OdsOrganization {
  resourceType?: string;
  id?: string;
  name?: string;
  address?: Array<{ line?: string[]; city?: string; postalCode?: string }>;
  telecom?: Array<{ system?: string; value?: string }>;
  position?: { latitude?: number; longitude?: number };
}

export async function getPracticeByOdsCode(odsCode: string): Promise<Practice | null> {
  const response = await fetch(`${ODS_BASE_URL}/${encodeURIComponent(odsCode)}`, {
    headers: { accept: 'application/fhir+json' }
  });
  if (!response.ok) return null;
  const organisation = (await response.json()) as OdsOrganization;
  const address = organisation.address?.[0];
  const phone = organisation.telecom?.find((item) => item.system === 'phone')?.value;
  const latitude = organisation.position?.latitude;
  const longitude = organisation.position?.longitude;
  if (!organisation.name || latitude === undefined || longitude === undefined) return null;
  return {
    odsCode,
    name: organisation.name,
    address: [...(address?.line ?? []), address?.city, address?.postalCode].filter(Boolean).join(', '),
    latitude,
    longitude,
    phone
  };
}

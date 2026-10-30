export interface SocialLinks {
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  x: string;
}

export interface Lead {
  source: string;
  source_url: string;
  type: string;
  name: string;
  category: string;
  location: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  email_source: string;
  social_links: SocialLinks;
  rating: number;
  review_count: number;
  verified: boolean;
  verification_note: string;
  collected_at: string;
  job_id: string;
}

export interface Job {
  id: string;
  source: string;
  query: string;
  location: string;
  limit: number;
  enrich_email: boolean;
  status: string;
  results: Lead[];
  created_at: string;
}

export interface JobCreate {
  source: string;
  query: string;
  location: string;
  limit: number;
  enrich_email: boolean;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error('Failed to load jobs');
  return (await res.json()) as Job[];
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return (await res.json()) as Job;
}

export async function createJob(payload: JobCreate): Promise<Job> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || 'Failed to create job');
  }
  return (await res.json()) as Job;
}

export function flattenLeads(jobs: Job[]): Lead[] {
  return jobs.flatMap((job) => job.results || []);
}

export function downloadCsv(filename: string, leads: Lead[]): void {
  const header = [
    'name',
    'source',
    'category',
    'location',
    'website',
    'email',
    'email_source',
    'phone',
    'rating',
    'review_count',
    'verified',
    'source_url',
    'job_id',
  ];
  const escape = (value: string | number | boolean) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.source,
      lead.category,
      lead.location,
      lead.website,
      lead.email,
      lead.email_source,
      lead.phone,
      lead.rating,
      lead.review_count,
      lead.verified,
      lead.source_url,
      lead.job_id,
    ]
      .map(escape)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...rows].join('\n')], {
    type: 'text/csv',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

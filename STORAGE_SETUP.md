# Supabase Storage Buckets Setup

Create the following storage buckets in the **Supabase Dashboard > Storage** tab:

## Required Buckets

| Bucket Name | Purpose | Public |
| --- | --- | --- |
| `job-attachments` | Photos and documents uploaded for job documentation (serial numbers, install photos) | Yes |
| `payment-proofs` | Client-uploaded payment proof files during quote acceptance workflow | Yes |
| `organization-assets` | Company logos, letterheads, and branding assets used in PDF generation | Yes |

## Steps

1. Go to **Supabase Dashboard** > **Storage**
2. Click **New Bucket** for each bucket above
3. Set the bucket name exactly as shown (lowercase, hyphenated)
4. Toggle **Public bucket** to **ON** for each (so public URLs work for PDFs and previews)
5. Optionally set file size limits (e.g., 10MB per file)

## Notes

- The `site-plans` bucket (for the Visual Site Planner feature) should already exist from a previous migration.
- If you need signed URLs instead of public URLs, set buckets to private and update the upload code to use `createSignedUrl()`.

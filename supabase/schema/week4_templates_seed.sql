-- Week 4 seed: core Templates + Clauses for Contracts Builder V1
-- Run this once in Supabase SQL editor.

-- Templates
insert into public.template (id, org_id, name, category, description, default_prompt, is_active) values
  (gen_random_uuid(), null, 'Mutual NDA', 'Legal', 'Mutual non-disclosure agreement between two commercial parties.', 'Draft a balanced mutual NDA between the parties, keeping language clear and concise.', true),
  (gen_random_uuid(), null, 'One-way NDA', 'Legal', 'One-way NDA where only one party is disclosing confidential information.', 'Draft a one-way NDA where only the disclosing party''s information is protected.', true),
  (gen_random_uuid(), null, 'Master Services Agreement (MSA)', 'Services', 'Framework agreement for ongoing professional or SaaS services.', 'Draft a master services agreement for a long-term commercial relationship.', true),
  (gen_random_uuid(), null, 'Statement of Work (SOW)', 'Services', 'Project-specific statement of work that attaches to an MSA.', 'Draft a clear statement of work with scope, deliverables, and timelines.', true),
  (gen_random_uuid(), null, 'SaaS Subscription Agreement', 'SaaS', 'Subscription agreement for a multi-tenant SaaS product.', 'Draft a SaaS subscription agreement with uptime, support and limitations of liability.', true),
  (gen_random_uuid(), null, 'Consulting Agreement', 'Services', 'Agreement for independent consulting or advisory services.', 'Draft a consulting agreement for an independent contractor providing services.', true),
  (gen_random_uuid(), null, 'Employment Agreement', 'HR', 'Full-time employment agreement for a startup employee.', 'Draft an employment agreement with IP assignment and confidentiality.', true),
  (gen_random_uuid(), null, 'Contractor Agreement', 'HR', 'Independent contractor / freelancer engagement.', 'Draft an independent contractor agreement with clear scope and IP ownership.', true),
  (gen_random_uuid(), null, 'Letter of Intent (LOI)', 'Corporate', 'Non-binding letter of intent for a potential transaction or partnership.', 'Draft a non-binding LOI summarizing key commercial terms and process.', true),
  (gen_random_uuid(), null, 'Memorandum of Understanding (MOU)', 'Corporate', 'MOU outlining principles for a future, more detailed agreement.', 'Draft an MOU that records alignment on key terms without being fully binding.', true),
  (gen_random_uuid(), null, 'Share Purchase Agreement', 'Corporate', 'Equity share purchase agreement for a private company.', 'Draft a simple share purchase agreement for a private company transaction.', true),
  (gen_random_uuid(), null, 'SAFE (Valuation Cap)', 'Startup', 'Standard SAFE investment with a valuation cap.', 'Draft a SAFE with a valuation cap using market-standard startup terms.', true),
  (gen_random_uuid(), null, 'SAFE (Discount)', 'Startup', 'Standard SAFE investment with a discount.', 'Draft a SAFE with a discount only using market-standard startup terms.', true),
  (gen_random_uuid(), null, 'Data Processing Agreement (DPA)', 'Privacy', 'DPA between controller and processor under modern privacy regulations.', 'Draft a data processing agreement with roles, security, and subprocessor terms.', true),
  (gen_random_uuid(), null, 'Advisor Agreement', 'Startup', 'Advisor equity / fee agreement for early-stage startups.', 'Draft an advisor agreement with vesting, confidentiality, and IP assignment.', true);

-- Clauses
insert into public.clause (id, org_id, name, category, body) values
  (gen_random_uuid(), null, 'Confidentiality', 'Core', 'Each party must keep the other party''s confidential information secret and only use it for the permitted purpose.'),
  (gen_random_uuid(), null, 'IP Ownership', 'Core', 'All intellectual property created specifically for the client under this agreement is owned by the client, except for pre-existing materials and tools of the provider.'),
  (gen_random_uuid(), null, 'License Grant', 'IP', 'The provider grants the client a limited, non-exclusive license to use the deliverables for its internal business purposes only, subject to payment of all fees.'),
  (gen_random_uuid(), null, 'Term and Termination', 'Core', 'This agreement starts on the effective date and continues until terminated. Either party may terminate for material breach not cured within a specified notice period.'),
  (gen_random_uuid(), null, 'Governing Law', 'Boilerplate', 'This agreement is governed by the laws of the specified jurisdiction, without giving effect to conflict of laws principles.'),
  (gen_random_uuid(), null, 'Dispute Resolution', 'Boilerplate', 'The parties will first attempt to resolve disputes informally in good faith. If not resolved, disputes may be submitted to mediation or arbitration as agreed.'),
  (gen_random_uuid(), null, 'Limitation of Liability', 'Risk', 'Neither party is liable for indirect or consequential losses. Direct liability is capped at a stated amount or the fees paid over a defined period, except for willful misconduct.'),
  (gen_random_uuid(), null, 'Indemnity', 'Risk', 'Each party agrees to indemnify the other for third-party claims arising from its breach of this agreement or violation of law, subject to usual exclusions and limits.'),
  (gen_random_uuid(), null, 'Payment Terms', 'Commercial', 'The client must pay invoices within a specified number of days from the invoice date. Late payments may accrue interest at the agreed rate.'),
  (gen_random_uuid(), null, 'Non-solicitation', 'HR', 'During the term and for a limited period after, neither party will solicit the other party''s key employees to leave their employment.'),
  (gen_random_uuid(), null, 'Non-compete (narrow)', 'HR', 'For a limited period and in a defined territory, the individual will not engage in directly competitive activities as defined in the agreement, subject to applicable law.'),
  (gen_random_uuid(), null, 'Data Protection / Privacy', 'Privacy', 'The parties will comply with applicable data protection laws, implement appropriate security measures, and cooperate on data subject requests and incident notifications.');


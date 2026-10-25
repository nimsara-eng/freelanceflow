export const sampleInvoices = [
  {
    id: 'sample-invoice-001',
    number: 'FF-2026-001',
    projectId: 'sample-northstar',
    status: 'sent',
    issuedDate: '2026-10-15',
    dueDate: '2026-11-02',
    items: [
      {
        id: 'website-design',
        description: 'Website design',
        quantity: 1,
        unitPriceCents: 4500000,
      },
    ],
  },
  {
    id: 'sample-invoice-002',
    number: 'FF-2026-002',
    projectId: 'sample-portal',
    status: 'sent',
    issuedDate: '2026-10-05',
    dueDate: '2026-10-20',
    items: [
      {
        id: 'portal-interface',
        description: 'Client portal interface',
        quantity: 1,
        unitPriceCents: 6000000,
      },
    ],
  },
  {
    id: 'sample-invoice-003',
    number: 'FF-2026-003',
    projectId: 'sample-brand',
    status: 'paid',
    issuedDate: '2026-10-01',
    dueDate: '2026-10-18',
    items: [
      {
        id: 'launch-page',
        description: 'Brand launch landing page',
        quantity: 1,
        unitPriceCents: 3000000,
      },
    ],
  },
  {
    id: 'sample-invoice-004',
    number: 'FF-2026-004',
    projectId: 'sample-northstar',
    status: 'draft',
    issuedDate: '2026-10-25',
    dueDate: '2026-11-15',
    items: [
      {
        id: 'design-refinements',
        description: 'Design refinement sessions',
        quantity: 2,
        unitPriceCents: 500000,
      },
    ],
  },
]
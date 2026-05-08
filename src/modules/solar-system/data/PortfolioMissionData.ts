export interface PortfolioCallout {
    category: string;
    title: string;
    subtitle: string;
    details: string[];
    href?: string;
}

export interface PortfolioMissionChapter {
    planet: string;
    section: string;
    title: string;
    subtitle: string;
    callouts: PortfolioCallout[];
}

export const PORTFOLIO_MISSION_DATA: PortfolioMissionChapter[] = [
    {
        planet: 'Sun',
        section: 'Profile Summary',
        title: 'Koushik Mondal',
        subtitle: 'Software Engineer - Satellite Simulation and Scalable Web Systems',
        callouts: [
            {
                category: 'Summary',
                title: 'Simulation engineer',
                subtitle: 'Next.js, React, modern web systems',
                details: [
                    'Builds high-performance satellite simulation and geospatial products.',
                    'Focuses on maintainable frontend architecture and production user experience.'
                ]
            },
            {
                category: 'Location',
                title: 'Pune, Maharashtra',
                subtitle: 'India',
                details: ['Working across simulation, visualization, and scalable web application domains.']
            },
            {
                category: 'Signal',
                title: 'Contact channel',
                subtitle: 'koushikm718@gmail.com',
                details: ['Phone: 7003885674']
            }
        ]
    },
    {
        planet: 'Mercury',
        section: 'Technical Skills',
        title: 'Frontend Core',
        subtitle: 'Fast interfaces, typed systems, reusable UI foundations',
        callouts: [
            {
                category: 'Languages',
                title: 'TypeScript stack',
                subtitle: 'TypeScript, JavaScript, HTML, CSS',
                details: ['Strong day-to-day implementation base for production frontend applications.']
            },
            {
                category: 'Frameworks',
                title: 'React systems',
                subtitle: 'React.js and Next.js',
                details: ['Builds scalable application structure, routing, component flows, and interactive screens.']
            },
            {
                category: 'Styling',
                title: 'UI implementation',
                subtitle: 'Tailwind CSS, ShadCN UI, Bootstrap, Aceternity UI',
                details: ['Creates polished component systems with responsive, ergonomic interaction patterns.']
            }
        ]
    },
    {
        planet: 'Venus',
        section: 'Technical Skills',
        title: 'Application Layer',
        subtitle: 'Backend integration, data flow, and state architecture',
        callouts: [
            {
                category: 'Backend',
                title: 'Node API layer',
                subtitle: 'Node.js, Express.js',
                details: ['Connects frontend workflows with REST, GraphQL, tRPC, and oRPC APIs.']
            },
            {
                category: 'Database',
                title: 'Persistent systems',
                subtitle: 'MongoDB, PostgreSQL, Prisma ORM',
                details: ['Works with application data models and clean API-to-database integration.']
            },
            {
                category: 'State and fetching',
                title: 'Reliable client data',
                subtitle: 'Redux, Context API, Zustand, TanStack Query',
                details: ['Optimizes data handling for complex dashboards and repeated user workflows.']
            }
        ]
    },
    {
        planet: 'Earth',
        section: 'Professional Experience',
        title: 'Geminus Tech',
        subtitle: 'Software Engineer | Nov 2022 - Present',
        callouts: [
            {
                category: 'Employer',
                title: 'Geminus Tech',
                subtitle: 'Software Engineer',
                details: [
                    'Develops scalable frontend applications using React and TypeScript.',
                    'Builds reusable UI component systems to improve delivery speed and consistency.'
                ],
                href: 'https://www.geminustech.com/'
            },
            {
                category: 'Client project',
                title: 'Antaris Space India',
                subtitle: 'Satellite simulation project',
                details: [
                    'Working on the Antaris project through Geminus Tech.',
                    'Contributes to production-grade simulation workflows and clean frontend architecture.'
                ]
            },
            {
                category: 'Impact',
                title: 'Performance mindset',
                subtitle: 'Maintainable systems',
                details: [
                    'Improves application performance through better state and data management patterns.',
                    'Integrates REST and GraphQL APIs with optimized data handling.'
                ]
            }
        ]
    },
    {
        planet: 'Mars',
        section: 'Key Project',
        title: 'Antaris Simulation',
        subtitle: 'Satellite configuration, simulation, and tracking workflows',
        callouts: [
            {
                category: 'Simulation',
                title: 'Satellite builder',
                subtitle: 'Payload, bus, and edge systems',
                details: ['Built interfaces enabling users to design and configure satellite components.']
            },
            {
                category: 'Tracking',
                title: 'Real and virtual satellites',
                subtitle: 'Pre and post simulation workflows',
                details: ['Enabled both real and virtual tracking flows for simulation operations.']
            },
            {
                category: '3D workflows',
                title: 'Cesium visualization',
                subtitle: 'Simulation clarity and interaction',
                details: ['Developed real-time 3D visualization workflows using Cesium for tracking and simulation.']
            }
        ]
    },
    {
        planet: 'Jupiter',
        section: 'Key Project',
        title: 'World Monitor',
        subtitle: 'Global intelligence monitoring and map-based visualization',
        callouts: [
            {
                category: 'Platform',
                title: 'Global data visualization',
                subtitle: 'Large-scale map layers',
                details: ['Built a real-time global data visualization platform using modern web technologies.']
            },
            {
                category: 'Maps',
                title: 'Dynamic geospatial UI',
                subtitle: 'Cesium JS and Mapbox experience',
                details: ['Designed dynamic map-based interfaces for handling large-scale data layers.']
            },
            {
                category: 'Architecture',
                title: 'Scalable frontend',
                subtitle: 'Performance optimization',
                details: ['Focused on frontend architecture that remains responsive under dense visualization workloads.']
            }
        ]
    },
    {
        planet: 'Saturn',
        section: 'Key Projects',
        title: 'Identity Websites',
        subtitle: 'Company and product websites with polished frontend execution',
        callouts: [
            {
                category: 'Company website',
                title: 'GeminusTech',
                subtitle: 'Corporate identity website',
                details: ['Built and delivered the company identity website experience.'],
                href: 'https://www.geminustech.com/'
            },
            {
                category: 'Product website',
                title: 'API Securist',
                subtitle: 'Security product identity website',
                details: ['Created a modern web presence for the API Securist product.'],
                href: 'https://apisecurist.com/'
            },
            {
                category: 'Project system',
                title: 'Reusable UI patterns',
                subtitle: 'Brand, layout, and interaction consistency',
                details: ['Translated company/product positioning into responsive web interfaces.']
            }
        ]
    },
    {
        planet: 'Uranus',
        section: 'Tools and Strengths',
        title: 'Delivery Systems',
        subtitle: 'Developer workflow, platforms, and engineering strengths',
        callouts: [
            {
                category: 'Platforms',
                title: 'Product tooling',
                subtitle: 'Git, GitHub, Azure DevOps, Jira',
                details: ['Works comfortably with collaborative delivery and issue-tracking workflows.']
            },
            {
                category: 'Backend platforms',
                title: 'Modern app services',
                subtitle: 'Supabase and Convex',
                details: ['Uses platform services to move quickly while keeping application structure clean.']
            },
            {
                category: 'Strengths',
                title: 'Architecture thinking',
                subtitle: 'Performance, clean code, fast learning',
                details: ['Strong problem-solving ability with a focus on scalable and maintainable implementation.']
            }
        ]
    },
    {
        planet: 'Neptune',
        section: 'Contact',
        title: 'Open Signal',
        subtitle: 'Reach out for simulation, visualization, and scalable web systems',
        callouts: [
            {
                category: 'Email',
                title: 'koushikm718@gmail.com',
                subtitle: 'Primary contact',
                details: ['Best channel for project, role, and collaboration conversations.']
            },
            {
                category: 'LinkedIn',
                title: 'Koushik Mondal',
                subtitle: 'linkedin.com/in/koushik-mondal-0a299723b',
                details: ['Professional profile and work history.'],
                href: 'https://www.linkedin.com/in/koushik-mondal-0a299723b/'
            },
            {
                category: 'GitHub',
                title: 'flyingheart1997',
                subtitle: 'github.com/flyingheart1997',
                details: ['Code, experiments, and engineering presence.'],
                href: 'https://github.com/flyingheart1997'
            }
        ]
    }
];

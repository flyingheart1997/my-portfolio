export interface PortfolioCallout {
    category: string;
    title: string;
    subtitle: string;
    tags: string[];
    highlights: string[];
    impact: string;
    href?: string;
}

export interface PortfolioMissionChapter {
    planet: string;
    section: string;
    title: string;
    subtitle: string;
    tags: string[];
    impact: string;
    callouts: PortfolioCallout[];
}

export const PORTFOLIO_MISSION_DATA: PortfolioMissionChapter[] = [
    {
        planet: 'Sun',
        section: 'Profile',
        title: 'Koushik Mondal',
        subtitle: 'Software Engineer - Satellite Simulation & Scalable Web Systems',
        tags: ['Pune, India', 'Next.js', 'React', 'TypeScript', 'Cesium', 'Mapbox'],
        impact: 'Builds advanced interactive systems across satellite simulation, geospatial visualization, and scalable frontend architecture.',
        callouts: [
            {
                category: 'Identity',
                title: 'Advanced Interactive Systems Engineer',
                subtitle: 'Frontend engineer with simulation and geospatial product experience',
                tags: ['Simulation UI', 'Realtime UX', 'Scalable Systems'],
                highlights: [
                    'Specializes in high-performance satellite simulation and geospatial systems.',
                    'Combines frontend architecture with visual systems thinking.'
                ],
                impact: 'Not a generic frontend profile: positioned for advanced interactive engineering work.'
            },
            {
                category: 'Current Base',
                title: 'Pune, Maharashtra',
                subtitle: 'Software Engineer working with production product teams',
                tags: ['Product Teams', 'Architecture', 'Performance'],
                highlights: [
                    'Builds maintainable interfaces for complex workflows.',
                    'Focuses on performance, clarity, and production-grade delivery.'
                ],
                impact: 'Strong fit for teams building complex web systems that need both speed and structure.'
            },
            {
                category: 'Contact Signal',
                title: 'koushikm718@gmail.com',
                subtitle: 'Primary contact channel | Phone: 7003885674',
                tags: ['Email', 'LinkedIn', 'GitHub'],
                highlights: [
                    'LinkedIn: koushik-mondal-0a299723b',
                    'GitHub: flyingheart1997'
                ],
                impact: 'Open for roles and projects around simulation, geospatial, and scalable frontend systems.'
            }
        ]
    },
    {
        planet: 'Mercury',
        section: 'Frontend',
        title: 'Frontend Engineering',
        subtitle: 'React, Next.js, TypeScript, and modern UI systems',
        tags: ['TypeScript', 'JavaScript', 'HTML', 'CSS', 'React', 'Next.js'],
        impact: 'Designs scalable frontend architecture for high-performance interactive products.',
        callouts: [
            {
                category: 'Core Stack',
                title: 'React + Next.js',
                subtitle: 'Production application interfaces with typed architecture',
                tags: ['React.js', 'Next.js', 'TypeScript'],
                highlights: [
                    'Builds reusable feature flows and component systems.',
                    'Keeps large frontend surfaces maintainable and predictable.'
                ],
                impact: 'Creates frontend foundations that scale beyond single-page UI screens.'
            },
            {
                category: 'UI Systems',
                title: 'Polished Components',
                subtitle: 'Tailwind CSS, ShadCN UI, Bootstrap, and Aceternity UI',
                tags: ['Tailwind', 'ShadCN', 'Bootstrap', 'Aceternity'],
                highlights: [
                    'Builds modern responsive layouts and product-ready components.',
                    'Balances visual polish with implementation discipline.'
                ],
                impact: 'Improves delivery speed while preserving product consistency.'
            },
            {
                category: 'State + UX',
                title: 'Interactive Reliability',
                subtitle: 'Redux, Context API, Zustand, and TanStack Query',
                tags: ['Redux', 'Context', 'Zustand', 'TanStack Query'],
                highlights: [
                    'Uses state tools based on workflow complexity.',
                    'Optimizes dense dashboards and repeated operational interactions.'
                ],
                impact: 'Keeps complex user flows responsive, stable, and easier to maintain.'
            }
        ]
    },
    {
        planet: 'Venus',
        section: 'Backend',
        title: 'Backend & Data Layer',
        subtitle: 'API integration, data models, and reliable application flows',
        tags: ['Node.js', 'Express.js', 'REST API', 'GraphQL', 'tRPC', 'oRPC', 'Prisma'],
        impact: 'Connects modern frontend systems to clean APIs, durable data models, and predictable data-fetching patterns.',
        callouts: [
            {
                category: 'API Integration',
                title: 'Service Workflows',
                subtitle: 'REST, GraphQL, tRPC, and oRPC integration',
                tags: ['REST', 'GraphQL', 'tRPC', 'oRPC'],
                highlights: [
                    'Integrates backend services into production frontend workflows.',
                    'Keeps API boundaries clean, typed, and predictable.'
                ],
                impact: 'Reduces UI complexity by designing explicit service boundaries.'
            },
            {
                category: 'Database',
                title: 'Persistent Systems',
                subtitle: 'MongoDB, PostgreSQL, and Prisma ORM',
                tags: ['MongoDB', 'PostgreSQL', 'Prisma'],
                highlights: [
                    'Works with both relational and document data models.',
                    'Maps product workflows into durable application state.'
                ],
                impact: 'Supports complex products with reliable data structures.'
            },
            {
                category: 'Data Fetching',
                title: 'Frontend Data Reliability',
                subtitle: 'TanStack Query and optimized data handling',
                tags: ['TanStack Query', 'Caching', 'Data UX'],
                highlights: [
                    'Improves data loading and update patterns.',
                    'Keeps interactive screens usable under changing data states.'
                ],
                impact: 'Makes dashboards and simulation views feel stable under real product pressure.'
            }
        ]
    },
    {
        planet: 'Earth',
        section: 'Experience',
        title: 'Geminus Tech',
        subtitle: 'Software Engineer | Nov 2022 - Present',
        tags: ['React', 'TypeScript', 'Frontend Architecture', 'REST', 'GraphQL'],
        impact: 'Works at Geminus Tech and contributes to the Antaris satellite simulation project through Geminus delivery.',
        callouts: [
            {
                category: 'Role',
                title: 'Software Engineer',
                subtitle: 'Scalable frontend applications using React and TypeScript',
                tags: ['React', 'TypeScript', 'Reusable UI'],
                highlights: [
                    'Develops scalable frontend applications.',
                    'Builds reusable UI component systems to improve delivery efficiency.'
                ],
                impact: 'Ships maintainable product interfaces for production business systems.',
                href: 'https://www.geminustech.com/'
            },
            {
                category: 'Delivery',
                title: 'API + Product Integration',
                subtitle: 'REST and GraphQL workflows with optimized data handling',
                tags: ['REST', 'GraphQL', 'Data Handling'],
                highlights: [
                    'Connects frontend features with backend services.',
                    'Improves maintainability through better state management patterns.'
                ],
                impact: 'Keeps product workflows reliable as application complexity grows.'
            },
            {
                category: 'Client Work',
                title: 'Antaris Project',
                subtitle: 'Satellite simulation and visualization platform',
                tags: ['Aerospace', 'Simulation', 'Visualization'],
                highlights: [
                    'Works on Antaris through Geminus Tech.',
                    'Contributes to production-grade satellite simulation UI workflows.'
                ],
                impact: 'Applies frontend architecture inside a high-context aerospace product.'
            }
        ]
    },
    {
        planet: 'Mars',
        section: 'Project',
        title: 'Satellite Simulation Dashboard',
        subtitle: 'Antaris simulation workflows for satellite design, configuration, and tracking',
        tags: ['Satellite Simulation', 'Cesium JS', '3D Tracking', 'Realtime UI'],
        impact: 'Built systems enabling real and virtual satellite simulation workflows.',
        callouts: [
            {
                category: 'Configuration',
                title: 'Satellite Builder',
                subtitle: 'Payload, bus, and edge system configuration',
                tags: ['Payload', 'Bus', 'Edge Systems'],
                highlights: [
                    'Built interfaces enabling users to design and configure satellites.',
                    'Supported satellite payload, bus, and edge component workflows.'
                ],
                impact: 'Turns complex satellite setup into structured, usable product flows.'
            },
            {
                category: 'Tracking',
                title: 'Real + Virtual Satellites',
                subtitle: 'Pre-simulation and post-simulation tracking workflows',
                tags: ['Tracking', 'Mission Flows', 'Simulation States'],
                highlights: [
                    'Enabled real satellite tracking workflows.',
                    'Supported virtual satellite tracking before and after simulation runs.'
                ],
                impact: 'Links planning, simulation, and tracking into one operator-friendly experience.'
            },
            {
                category: 'Visualization',
                title: 'Cesium 3D Simulation',
                subtitle: 'Realtime 3D visualization and simulation clarity',
                tags: ['Cesium', '3D Maps', 'Orbital UI'],
                highlights: [
                    'Developed 3D visualization workflows using Cesium.',
                    'Improved simulation and tracking clarity through interactive views.'
                ],
                impact: 'Makes orbital and simulation state easier to understand through 3D interaction.'
            }
        ]
    },
    {
        planet: 'Jupiter',
        section: 'Project',
        title: 'World Monitor',
        subtitle: 'Global intelligence monitoring platform with map-based data visualization',
        tags: ['Geospatial', 'Mapbox', 'Cesium', 'Realtime Data', 'Large-scale Layers'],
        impact: 'Built a real-time global data visualization platform using modern web technologies.',
        callouts: [
            {
                category: 'Platform',
                title: 'Global Intelligence UI',
                subtitle: 'Map-first monitoring interface for large-scale data context',
                tags: ['Monitoring', 'Global Data', 'Dashboards'],
                highlights: [
                    'Built real-time global data visualization experiences.',
                    'Designed interfaces for scanning large-scale intelligence layers.'
                ],
                impact: 'Turns complex global data into readable monitoring workflows.'
            },
            {
                category: 'Maps',
                title: 'Dynamic Geospatial Layers',
                subtitle: 'Large-scale data layers with map-based interaction',
                tags: ['Mapbox', 'Cesium', 'Layer Controls'],
                highlights: [
                    'Designed dynamic map-based interfaces.',
                    'Handled large-scale data layers with interaction clarity.'
                ],
                impact: 'Improves decision-making through cleaner geospatial visualization.'
            },
            {
                category: 'Architecture',
                title: 'Performance-focused Frontend',
                subtitle: 'Scalable UI architecture under dense visualization workloads',
                tags: ['Performance', 'Architecture', 'Frontend Systems'],
                highlights: [
                    'Focused on scalable frontend architecture.',
                    'Balanced performance optimization with user experience.'
                ],
                impact: 'Preserves responsiveness in dense real-time monitoring screens.'
            }
        ]
    },
    {
        planet: 'Saturn',
        section: 'Web Systems',
        title: 'Company & Product Websites',
        subtitle: 'Identity websites for Geminus Tech and API Securist',
        tags: ['Responsive UI', 'Brand Systems', 'Frontend Delivery', 'Modern Web'],
        impact: 'Delivered polished identity websites for a company brand and a security product.',
        callouts: [
            {
                category: 'Company Website',
                title: 'GeminusTech',
                subtitle: 'Corporate identity website implementation',
                tags: ['Brand UI', 'Responsive Layout', 'Frontend'],
                highlights: [
                    'Built the company identity website experience.',
                    'Translated brand positioning into a polished frontend surface.'
                ],
                impact: 'Created a credible, responsive company web presence.',
                href: 'https://www.geminustech.com/'
            },
            {
                category: 'Product Website',
                title: 'API Securist',
                subtitle: 'Security product identity website',
                tags: ['Security Product', 'Branding', 'UI Polish'],
                highlights: [
                    'Implemented a modern security product website.',
                    'Focused on clean visual execution and product credibility.'
                ],
                impact: 'Presents a technical security product through a clear, trustworthy interface.',
                href: 'https://apisecurist.com/'
            },
            {
                category: 'Execution',
                title: 'Responsive Product Experience',
                subtitle: 'Modern interaction systems and maintainable layout patterns',
                tags: ['Responsive', 'Interaction', 'Reusable Layouts'],
                highlights: [
                    'Created repeatable UI and layout patterns.',
                    'Balanced visual polish with maintainable implementation.'
                ],
                impact: 'Improves brand quality without sacrificing engineering maintainability.'
            }
        ]
    },
    {
        planet: 'Uranus',
        section: 'Tools',
        title: 'Engineering Toolkit',
        subtitle: 'Tools, platforms, and delivery workflows used in production',
        tags: ['Git', 'GitHub', 'Azure DevOps', 'Jira', 'Supabase', 'Convex'],
        impact: 'Combines product delivery discipline with fast learning, clean code, and architecture thinking.',
        callouts: [
            {
                category: 'Workflow',
                title: 'Team Delivery',
                subtitle: 'Git, GitHub, Azure DevOps, and Jira',
                tags: ['Git', 'GitHub', 'Azure DevOps', 'Jira'],
                highlights: [
                    'Works inside collaborative engineering workflows.',
                    'Keeps implementation aligned with product delivery priorities.'
                ],
                impact: 'Comfortable in structured production development environments.'
            },
            {
                category: 'Platforms',
                title: 'Modern App Services',
                subtitle: 'Supabase and Convex for faster product delivery',
                tags: ['Supabase', 'Convex', 'Backend Services'],
                highlights: [
                    'Uses platform services pragmatically.',
                    'Maintains clean application structure while moving quickly.'
                ],
                impact: 'Accelerates implementation without losing architectural control.'
            },
            {
                category: 'Strengths',
                title: 'System Design Mindset',
                subtitle: 'Performance optimization, clean code, and problem solving',
                tags: ['Architecture', 'Performance', 'Problem Solving'],
                highlights: [
                    'Breaks complex workflows into clear product systems.',
                    'Learns fast across new domains and tools.'
                ],
                impact: 'Strong fit for high-context engineering teams building advanced interactive products.'
            }
        ]
    },
    {
        planet: 'Neptune',
        section: 'Contact',
        title: 'Open Signal',
        subtitle: 'Reach out for simulation, geospatial, and scalable frontend opportunities',
        tags: ['Email', 'LinkedIn', 'GitHub', 'Pune'],
        impact: 'Available for conversations around satellite simulation, geospatial visualization, and advanced frontend systems.',
        callouts: [
            {
                category: 'Email',
                title: 'koushikm718@gmail.com',
                subtitle: 'Primary contact channel',
                tags: ['Email', 'Collaboration'],
                highlights: [
                    'Best channel for project, role, and collaboration conversations.',
                    'Phone: 7003885674'
                ],
                impact: 'Direct channel for recruiter and product-team conversations.'
            },
            {
                category: 'LinkedIn',
                title: 'Koushik Mondal',
                subtitle: 'linkedin.com/in/koushik-mondal-0a299723b',
                tags: ['Professional Profile', 'Work History'],
                highlights: [
                    'Professional profile and experience overview.',
                    'Useful for role, project, and collaboration context.'
                ],
                impact: 'Recruiter-friendly signal for work history and professional presence.',
                href: 'https://www.linkedin.com/in/koushik-mondal-0a299723b/'
            },
            {
                category: 'GitHub',
                title: 'flyingheart1997',
                subtitle: 'github.com/flyingheart1997',
                tags: ['Code', 'Engineering Presence'],
                highlights: [
                    'Public engineering presence and experiments.',
                    'Code signal for implementation quality and learning.'
                ],
                impact: 'Supports the portfolio with a public engineering footprint.',
                href: 'https://github.com/flyingheart1997'
            }
        ]
    }
];

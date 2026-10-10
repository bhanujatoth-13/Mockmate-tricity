import {
  ResumeBulletImprovement,
  ResumeDeepAnalysis,
  ResumeProjectDetected,
  ResumeQuestionItem,
  ResumeWeaknessItem,
  InterviewSession,
} from '../types';
import { INTERVIEWERS } from './storage';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Skill taxonomy dictionary
const TECH_SKILL_DICTIONARY: Record<string, string[]> = {
  frontend: [
    'React', 'Next.js', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript',
    'HTML5', 'CSS3', 'Tailwind CSS', 'Redux', 'Zustand', 'GraphQL',
    'Vite', 'Webpack', 'Jest', 'Cypress'
  ],
  backend: [
    'Node.js', 'Express', 'NestJS', 'Python', 'Django', 'FastAPI',
    'Java', 'Spring Boot', 'Go', 'Rust', 'C++', 'C#', '.NET',
    'REST APIs', 'GraphQL', 'gRPC', 'WebSockets', 'Microservices'
  ],
  databases: [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'SQLite', 'DynamoDB', 'Cassandra', 'Prisma', 'Drizzle'
  ],
  devops: [
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD',
    'GitHub Actions', 'Terraform', 'Linux', 'Nginx', 'Prometheus'
  ],
  fundamentals: [
    'Data Structures & Algorithms', 'System Design', 'Object-Oriented Programming (OOP)',
    'Database Management Systems (DBMS)', 'Operating Systems', 'Computer Networks'
  ],
  data_ai: [
    'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow',
    'Pandas', 'NumPy', 'Scikit-Learn', 'NLP', 'Computer Vision',
    'LLMs', 'Prompt Engineering', 'RAG'
  ]
};

const ROLE_ESSENTIAL_SKILLS: Record<string, string[]> = {
  'Software Development Engineer (SDE-1)': ['Data Structures & Algorithms', 'System Design', 'PostgreSQL', 'Docker', 'Git', 'REST APIs', 'Testing/Jest'],
  'Frontend Developer': ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Web Performance', 'Testing (Jest/Playwright)', 'State Management'],
  'Backend Developer': ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Microservices', 'API Security', 'System Design'],
  'Full Stack Developer': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'CI/CD', 'Git'],
  'Data Analyst': ['SQL', 'Python', 'Pandas', 'Tableau/PowerBI', 'Data Cleaning', 'Statistics', 'Excel'],
  'AI / ML Engineer': ['Python', 'PyTorch', 'Pandas', 'Model Evaluation', 'Docker', 'REST APIs', 'RAG/LLMs'],
};

/**
 * Heuristic & Rule-based Resume Analyzer
 * Generates ATS scores, deep shortcomings/lacking feedback, and tailored questions.
 */
export function analyzeResumeTextLocally(
  resumeText: string,
  targetRole: string = 'Software Development Engineer (SDE-1)'
): ResumeDeepAnalysis {
  const clean = resumeText.trim();
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Detect candidate name
  let candidateName = 'Candidate';
  for (const line of lines.slice(0, 4)) {
    if (
      line.length > 2 &&
      line.length < 35 &&
      !line.toLowerCase().includes('resume') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('email') &&
      !line.toLowerCase().includes('phone') &&
      !line.toLowerCase().includes('github') &&
      !line.toLowerCase().includes('http')
    ) {
      candidateName = line.replace(/[^a-zA-Z\s]/g, '').trim() || 'Candidate';
      break;
    }
  }

  // 2. Extract detected skills
  const extractedSkills: string[] = [];
  const lowerResume = clean.toLowerCase();

  for (const group of Object.values(TECH_SKILL_DICTIONARY)) {
    for (const skill of group) {
      const lowerSkill = skill.toLowerCase();
      // Regex word boundary match
      const regex = new RegExp(`\\b${escapeRegExp(lowerSkill)}\\b`, 'i');
      if (regex.test(clean) && !extractedSkills.includes(skill)) {
        extractedSkills.push(skill);
      }
    }
  }

  // Fallback skills if sparse
  if (extractedSkills.length === 0) {
    extractedSkills.push('JavaScript', 'Data Structures', 'Git', 'Problem Solving');
  }

  // 3. Recommended role alignment
  let recommendedRole = targetRole;
  if (lowerResume.includes('react') && lowerResume.includes('css') && !lowerResume.includes('spring')) {
    recommendedRole = 'Frontend Developer';
  } else if (lowerResume.includes('docker') && lowerResume.includes('sql') && lowerResume.includes('api')) {
    recommendedRole = 'Full Stack Developer';
  } else if (lowerResume.includes('machine learning') || lowerResume.includes('pytorch')) {
    recommendedRole = 'AI / ML Engineer';
  }

  // 4. Missing skills for role
  const essentialForRole = ROLE_ESSENTIAL_SKILLS[recommendedRole] || ROLE_ESSENTIAL_SKILLS['Software Development Engineer (SDE-1)'];
  const missingSkillsForRole = essentialForRole.filter(
    (req) => !extractedSkills.some((s) => s.toLowerCase() === req.toLowerCase())
  );

  // 5. Detect projects
  const detectedProjects: ResumeProjectDetected[] = [];
  const projectKeywords = ['project', 'built', 'developed', 'created', 'designed', 'engine', 'system', 'app', 'platform', 'portal'];
  
  lines.forEach((line) => {
    const isProjectHeader =
      (line.includes('|') || line.includes('–') || line.includes('-')) &&
      projectKeywords.some((k) => line.toLowerCase().includes(k)) &&
      line.length < 80;

    if (isProjectHeader && detectedProjects.length < 4) {
      const parts = line.split(/[|–-]/).map((p) => p.trim());
      const title = parts[0];
      const detectedTech = extractedSkills.filter((s) => line.toLowerCase().includes(s.toLowerCase()));

      detectedProjects.push({
        name: title,
        techStack: detectedTech.length > 0 ? detectedTech : ['Web Technologies', 'APIs'],
        assessment: 'Identified core portfolio project demonstration.',
        critique: 'Project bullet points need explicit scaling numbers, latency metrics, and user traffic volume.',
      });
    }
  });

  if (detectedProjects.length === 0) {
    detectedProjects.push(
      {
        name: 'Full-Stack Web Application System',
        techStack: extractedSkills.slice(0, 3),
        assessment: 'General software engineering implementation listed on profile.',
        critique: 'Requires explicit latency benchmarking, concurrent user stress-testing, and architecture diagrams.',
      },
      {
        name: 'Algorithms & Realtime Data Engine',
        techStack: extractedSkills.slice(2, 5),
        assessment: 'Problem-solving and algorithmic component.',
        critique: 'Lacks details on edge case handling, space/time bounds, and fault-tolerance.',
      }
    );
  }

  // 6. Deep Feedback: Lacking Areas Analysis
  const lackingAreas: ResumeWeaknessItem[] = [];

  // Check 1: Quantitative Metrics deficiency (huge recruiter filter)
  const numbersCount = (clean.match(/\b\d+(\.\d+)?%|\b\d+k|\b\d+ms|\b\d+x|\b\d+\b/gi) || []).length;
  if (numbersCount < 4) {
    lackingAreas.push({
      id: 'lack-quant',
      category: 'Quantification',
      severity: 'Critical',
      title: 'Severe Lack of Measurable Impact & Hard Metrics',
      description: `Found only ${numbersCount} quantitative references across your entire resume. Top tier engineering hiring managers scan for measurable outcomes (e.g. "Reduced API response time by 42%", "Processed 10,000+ daily events", "Saved 15 hours of manual triage/week").`,
      currentExcerpt: lines.find((l) => l.toLowerCase().includes('developed') || l.toLowerCase().includes('built')) || 'Built an application using React and Node.js',
      improvedVersion: 'Architected full-stack portal using React & Node.js, slashing page render times by 38% and serving 1,200+ concurrent active sessions.',
      whyItMatters: 'Resumes without metrics read like job duty lists rather than high-impact engineering accomplishments. Recruiters will assume low scale or passive involvement.',
    });
  }

  // Check 2: Missing Essential Frameworks / Cloud
  if (missingSkillsForRole.length > 0) {
    lackingAreas.push({
      id: 'lack-skills',
      category: 'Missing Skills',
      severity: 'High',
      title: `Missing Industry Standard Skills for ${recommendedRole}`,
      description: `Your profile lacks explicit mentions of: ${missingSkillsForRole.join(', ')}. In modern technical screenings, ATS scanners instantly down-rank candidates lacking these foundational ecosystem tools.`,
      improvedVersion: `Add a dedicated 'Developer Tooling & Infrastructure' section explicitly listing: ${missingSkillsForRole.slice(0, 4).join(', ')}.`,
      whyItMatters: 'Recruiters filter out entry/campus applicants whose tech stack appears purely academic or outdated.',
    });
  }

  // Check 3: Passive or Weak Action Verbs
  const weakVerbs = ['helped', 'worked on', 'assisted', 'responsible for', 'involved in', 'participated'];
  const weakLines = lines.filter((l) => weakVerbs.some((wv) => l.toLowerCase().includes(wv)));
  if (weakLines.length > 0 || lines.some((l) => l.startsWith('Used ') || l.startsWith('Did '))) {
    lackingAreas.push({
      id: 'lack-verbs',
      category: 'Action Verbs',
      severity: 'High',
      title: 'Passive Phrasing & Vague Ownership Language',
      description: `Phrases like "worked on", "assisted", or "responsible for" diminish your contribution and suggest subordinate support rather than engineering ownership.`,
      currentExcerpt: weakLines[0] || 'Worked on developing backend services and database tables.',
      improvedVersion: 'Spearheaded backend API microservices and normalized PostgreSQL schema, decreasing query execution latency from 240ms to 65ms.',
      whyItMatters: 'Technical interviewers want owners who make architectural choices, write tests, and ship solutions end-to-end.',
    });
  }

  // Check 4: Project Depth & Architecture Gaps
  const hasArchitectureDetails =
    lowerResume.includes('cache') ||
    lowerResume.includes('redis') ||
    lowerResume.includes('docker') ||
    lowerResume.includes('concurrency') ||
    lowerResume.includes('websocket') ||
    lowerResume.includes('microservice');

  if (!hasArchitectureDetails) {
    lackingAreas.push({
      id: 'lack-architecture',
      category: 'Project Depth',
      severity: 'Medium',
      title: 'Projects Lack Architectural Rigor & Distributed System Concepts',
      description: 'Your project bullet points describe what the app does from an end-user view, but omit the technical engineering hurdles: concurrency management, indexing, caching strategies, and state synchronization.',
      improvedVersion: 'Integrated Redis caching layer with LRU eviction policy to cache frequent database reads, reducing disk I/O operations by 55%.',
      whyItMatters: 'During technical interviews, 70% of questions challenge your architecture trade-offs and edge case handling.',
    });
  }

  // Check 5: Live URLs or GitHub Verification
  const hasLinks = lowerResume.includes('github.com') || lowerResume.includes('http') || lowerResume.includes('vercel.app');
  if (!hasLinks) {
    lackingAreas.push({
      id: 'lack-links',
      category: 'Formatting/ATS',
      severity: 'Medium',
      title: 'Missing Live Demo Links & Public Repository Proof',
      description: 'No clickable GitHub repository or deployed production links detected in your projects. Verifiable code proof builds instant interviewer trust.',
      improvedVersion: 'Include direct hyperlinks for each flagship project: [Live Demo | GitHub Repo | System Architecture Doc].',
      whyItMatters: 'Engineers who deploy live projects stand out over 90% of candidates who only present local localhost assignments.',
    });
  }

  // 7. Bullet Point Improvements (Before & After Rewrites)
  const bulletPointImprovements: ResumeBulletImprovement[] = [
    {
      id: 'b-1',
      original: lines.find((l) => l.length > 25 && l.length < 120 && (l.includes('React') || l.includes('web') || l.includes('app'))) ||
        'Developed a responsive frontend application with React and Tailwind CSS for users to book sessions.',
      improved: 'Architected responsive single-page portal with React and Tailwind CSS, slashing initial bundle size by 34% via code-splitting and boosting Lighthouse performance score to 98/100.',
      critique: 'Original describes generic coding activity. Rewrite emphasizes architectural decisions, bundle optimization metrics, and measurable page performance.',
      impactGain: '+25% ATS Score & High Interviewer Engagement',
    },
    {
      id: 'b-2',
      original: lines.find((l) => l.length > 25 && l.length < 120 && (l.includes('API') || l.includes('backend') || l.includes('database'))) ||
        'Created REST APIs using Node.js and Express connected to MongoDB database for saving data.',
      improved: 'Engineered high-throughput RESTful API suite in Node.js/Express with MongoDB indexing, handling 500+ requests/sec with p95 response times under 45ms.',
      critique: 'Original lacks scale and speed context. Rewrite highlights throughput (RPS), p95 latency bounds, and database indexing.',
      impactGain: '+30% Technical Credibility',
    },
    {
      id: 'b-3',
      original: lines.find((l) => l.length > 20 && (l.includes('team') || l.includes('git') || l.includes('tested'))) ||
        'Tested the application and fixed various bugs reported by users during testing.',
      improved: 'Implemented end-to-end automated test suites using Jest & Playwright, achieving 88% branch coverage and cutting regression incidents by 40% prior to staging deployment.',
      critique: 'Original is passive and reactive. Rewrite demonstrates professional CI/CD engineering standards and quantitative bug reduction.',
      impactGain: '+20% Seniority Signal',
    },
  ];

  // 8. ATS Score Calculation
  const quantScore = Math.min(100, Math.max(30, numbersCount * 18));
  const skillScore = Math.min(100, Math.max(40, extractedSkills.length * 10 - missingSkillsForRole.length * 8));
  const depthScore = hasArchitectureDetails ? 85 : 55;
  const clarityScore = hasLinks ? 88 : 65;
  const atsScore = Math.round((quantScore * 0.35) + (skillScore * 0.3) + (depthScore * 0.2) + (clarityScore * 0.15));

  // 9. Generate Tailored Interview Questions based specifically on this resume
  const firstProjectName = detectedProjects[0]?.name || 'Flagship Engineering Project';
  const secondProjectName = detectedProjects[1]?.name || 'Data and Systems Project';
  const topSkill1 = extractedSkills[0] || 'TypeScript';
  const topSkill2 = extractedSkills[1] || 'React';
  const topSkill3 = extractedSkills[2] || 'Node.js';

  const tailoredQuestions: ResumeQuestionItem[] = [
    {
      id: 'rq-1',
      category: 'Project Deep Dive',
      question: `On your resume, you listed "${firstProjectName}". Could you walk me through the system architecture, how data flows through it end-to-end, and the single toughest engineering hurdle you solved during development?`,
      contextOrReason: `Triggered by flagship project "${firstProjectName}" on resume.`,
      stage: 'resume',
      hint: 'Detail the problem, your exact architectural contribution, trade-offs between technologies, and concrete business/user impact.',
      expectedKeywords: ['architecture', 'trade-offs', 'latency', 'database schema', 'bottleneck', 'testing'],
    },
    {
      id: 'rq-2',
      category: 'Skill Verification',
      question: `You highlighted proficiency in ${topSkill1} and ${topSkill2}. In production applications, how do you handle state consistency, asynchronous race conditions, and memory leaks when scaling these technologies?`,
      contextOrReason: `Validating claimed competencies: ${topSkill1} & ${topSkill2}.`,
      stage: 'technical',
      hint: 'Give concrete code examples: cleanup in useEffect/listeners, immutability, optimistic UI updates, or connection pools.',
      expectedKeywords: ['event loop', 'asynchronous', 'memory leaks', 'closures', 'caching', 'optimistic updates'],
    },
    {
      id: 'rq-3',
      category: 'Addressing Weakness',
      question: `Looking at your project description for "${secondProjectName}", what specific performance benchmarks did you run? What was the throughput or latency before versus after your optimizations?`,
      contextOrReason: `Challenging lack of quantitative metrics on resume project "${secondProjectName}".`,
      stage: 'resume',
      hint: 'State concrete numbers (e.g. latency in ms, cache hit rates, memory footprint) and describe how you profiled the application.',
      expectedKeywords: ['benchmarking', 'profiling', 'latency', 'metrics', 'cache hit rate', 'load testing'],
    },
    {
      id: 'rq-4',
      category: 'Project Deep Dive',
      question: `If 50,000 users simultaneously accessed your "${firstProjectName}" project during a viral launch, what component would fail first, and how would you redesign the architecture with caching and queuing to survive?`,
      contextOrReason: `Challenging project scalability and system boundaries.`,
      stage: 'system_design',
      hint: 'Break down database connection exhaustion, introduce Redis caching, rate limiting, and asynchronous background worker queues.',
      expectedKeywords: ['connection pool', 'Redis', 'rate limiting', 'queue/Kafka', 'load balancer', 'horizontal scaling'],
    },
    {
      id: 'rq-5',
      category: 'Behavioral',
      question: `In your experience building projects, describe a situation where a technical requirement changed right before a deadline, or where you had to compromise on an architectural ideal to ship on time. How did you decide?`,
      contextOrReason: `Evaluating pragmatic engineering judgment and timeline delivery.`,
      stage: 'behavioral',
      hint: 'Use the STAR format (Situation, Task, Action, Result). Emphasize communication, risk analysis, and fast iterative delivery.',
      expectedKeywords: ['STAR method', 'trade-off', 'stakeholder communication', 'prioritization', 'technical debt'],
    },
  ];

  const overallCritique = `Your resume demonstrates good fundamental technical exposure with ${extractedSkills.length} identified competencies. However, it currently scores ${atsScore}/100 on our Technical Screening Index primarily due to ${
    lackingAreas[0]?.title || 'unquantified bullet points'
  }. Recruiters reviewing hundreds of campus profiles look for proof of scale and ownership. Addressing the ${lackingAreas.length} flagged shortcoming areas below will significantly elevate your interview callback rate.`;

  const actionableNextSteps = [
    `Quantify every project bullet point with at least 1 concrete metric (% speedup, volume, RPS, users served).`,
    `Add missing high-demand ecosystem tools (${missingSkillsForRole.slice(0, 3).join(', ') || 'Docker, CI/CD, Redis'}) to your skills section.`,
    `Replace passive verbs ("helped with", "worked on") with power engineering verbs ("Architected", "Engineered", "Optimized", "Spearheaded").`,
    `Add live production demo URLs and public GitHub repository links next to each project title.`,
    `Practice the 5 tailored interview questions generated above to defend your resume claims confidently.`,
  ];

  return {
    candidateName,
    recommendedRole,
    summary: `Software developer with proficiencies across ${extractedSkills.slice(0, 5).join(', ')}. Target alignment with ${recommendedRole} roles.`,
    atsScore,
    atsScoreBreakdown: {
      quantification: quantScore,
      skillRelevance: skillScore,
      depthAndImpact: depthScore,
      clarityAndFormat: clarityScore,
    },
    extractedSkills,
    missingSkillsForRole,
    projectsDetected: detectedProjects,
    lackingAreas,
    bulletPointImprovements,
    tailoredQuestions,
    overallCritique,
    actionableNextSteps,
  };
}

/**
 * Creates an InterviewSession primed with the resume's tailored questions
 */
export function createResumeInterviewSession(
  analysis: ResumeDeepAnalysis,
  resumeText: string,
  role?: string,
  company: string = 'Top Tech Recruiter'
): InterviewSession {
  const targetRole = role || analysis.recommendedRole || 'Software Development Engineer (SDE-1)';

  return {
    id: 'sess-resume-' + Date.now(),
    mode: 'full',
    title: `Resume Deep-Dive: ${targetRole}`,
    role: targetRole,
    company,
    difficulty: 'Intermediate',
    interviewer: INTERVIEWERS[0],
    topics: ['Resume', 'Technical', 'System Design', 'Behavioral'],
    resumeText,
    candidateSkills: analysis.extractedSkills,
    createdAt: Date.now(),
    status: 'in_progress',
    totalQuestions: analysis.tailoredQuestions.length,
    permissionsApproved: true,
    isResumeBased: true,
    resumeQuestions: analysis.tailoredQuestions,
    resumeAnalysis: analysis,
  };
}

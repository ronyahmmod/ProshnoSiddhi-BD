import { Question, ExamCategory, SubjectHierarchy, BlogPost } from '../types';

export const initialExams: ExamCategory[] = [
  {
    id: 'exam-bcs',
    name: '46th & 45th BCS Cadre Preliminary',
    code: 'BCS',
    description: 'Bangladesh Civil Service Preliminary & Written Examination covering 200 marks syllabus.',
    subjects: ['Bangladesh Affairs', 'International Affairs', 'Bengali Language', 'English', 'Mathematics', 'General Science', 'Computer Science'],
    color: '#059669',
    icon: 'GraduationCap'
  },
  {
    id: 'exam-bank',
    name: 'Combined 10 Banks Officer & Senior Officer',
    code: 'Bank',
    description: 'Bangladesh Bank AD, Sonali, Janata, Agrani, Rupali Combined recruitment questions.',
    subjects: ['Mathematics', 'English', 'General Knowledge', 'Computer Science', 'Bangladesh Affairs'],
    color: '#2563eb',
    icon: 'Building2'
  },
  {
    id: 'exam-gre',
    name: 'GRE General Examination (Quant & Verbal)',
    code: 'GRE',
    description: 'Quantitative Reasoning, Verbal Reasoning, and Analytical Writing for global masters/PhD admission.',
    subjects: ['Mathematics', 'English'],
    color: '#7c3aed',
    icon: 'Award'
  },
  {
    id: 'exam-primary',
    name: 'Primary Assistant Teacher & NTRCA',
    code: 'Primary',
    description: 'Government Primary School Assistant Teacher and NTRCA School/College Lecturer recruitment.',
    subjects: ['Bengali Language', 'English', 'Mathematics', 'General Science', 'General Knowledge'],
    color: '#d97706',
    icon: 'BookOpen'
  },
  {
    id: 'exam-medical',
    name: 'Medical & Dental Admission (MBBS/BDS)',
    code: 'Medical',
    description: 'Medical College Entrance Examination covering Physics, Chemistry, Biology, English & GK.',
    subjects: ['General Science', 'English', 'General Knowledge'],
    color: '#dc2626',
    icon: 'HeartPulse'
  }
];

export const initialSubjectHierarchy: SubjectHierarchy[] = [
  {
    id: 'sub-math',
    name: 'Mathematics',
    examIds: ['exam-bcs', 'exam-bank', 'exam-gre', 'exam-primary'],
    topics: [
      {
        name: 'Algebra',
        subtopics: ['Quadratic Equations', 'Logarithms & Exponents', 'Sequences & Series', 'Linear Inequalities']
      },
      {
        name: 'Arithmetic',
        subtopics: ['Speed, Time & Distance', 'Work & Pipes', 'Profit & Loss', 'Ratios & Percentages', 'Simple & Compound Interest']
      },
      {
        name: 'Geometry',
        subtopics: ['Triangles & Circles', 'Polygons & Angles', 'Mensuration 2D & 3D', 'Coordinate Geometry']
      },
      {
        name: 'Quantitative Reasoning',
        subtopics: ['Set Theory & Venn Diagrams', 'Permutations & Combinations', 'Probability Theory', 'Data Sufficiency']
      }
    ]
  },
  {
    id: 'sub-english',
    name: 'English',
    examIds: ['exam-bcs', 'exam-bank', 'exam-gre', 'exam-primary', 'exam-medical'],
    topics: [
      {
        name: 'Grammar',
        subtopics: ['Subject-Verb Agreement', 'Right Form of Verbs', 'Prepositions', 'Conditionals & Modals', 'Voice & Narration']
      },
      {
        name: 'Vocabulary',
        subtopics: ['Synonyms & Antonyms', 'GRE High Frequency Words', 'Analogy', 'Spelling & One-word Substitution']
      },
      {
        name: 'Literature',
        subtopics: ['Elizabethan & Romantic Era', 'Victorian & Modern Poets', 'Famous Quotes & Characters']
      },
      {
        name: 'Idioms & Phrases',
        subtopics: ['Common Idioms', 'Phrasal Verbs', 'Proverbs']
      }
    ]
  },
  {
    id: 'sub-science',
    name: 'General Science',
    examIds: ['exam-bcs', 'exam-primary', 'exam-medical'],
    topics: [
      {
        name: 'Physics',
        subtopics: ['Mechanics & Gravitation', 'Electricity & Magnetism', 'Optics & Wave Motion', 'Nuclear Physics']
      },
      {
        name: 'Chemistry',
        subtopics: ['Periodic Table & Elements', 'Acids, Bases & Salts', 'Organic Compounds', 'Chemical Bonding']
      },
      {
        name: 'Biology',
        subtopics: ['Cell Biology & Genetics', 'Human Anatomy & Physiology', 'Diseases & Nutrition', 'Plant Kingdom']
      },
      {
        name: 'Astronomy & Environment',
        subtopics: ['Solar System & Universe', 'Ecology & Climate Change', 'Pollution & Conservation']
      }
    ]
  },
  {
    id: 'sub-ict',
    name: 'Computer Science',
    examIds: ['exam-bcs', 'exam-bank'],
    topics: [
      {
        name: 'Data Structures',
        subtopics: ['Stacks & Queues', 'Trees & Graphs', 'Arrays & Linked Lists', 'Hash Tables']
      },
      {
        name: 'Algorithms',
        subtopics: ['Sorting & Searching', 'Time Complexity $O(n)$', 'Dynamic Programming', 'Graph Traversal']
      },
      {
        name: 'Networking',
        subtopics: ['TCP/IP & OSI Model', 'HTTP/2 & Security Protocols', 'IP Addressing & Subnetting', 'Routing & Switching']
      },
      {
        name: 'Database & Cybersecurity',
        subtopics: ['SQL Queries & Joins', 'Normalization', 'Cryptography & Encryption', 'Malware & Firewalls']
      }
    ]
  },
  {
    id: 'sub-bd',
    name: 'Bangladesh Affairs',
    examIds: ['exam-bcs', 'exam-bank', 'exam-primary'],
    topics: [
      {
        name: 'History',
        subtopics: ['1952 Language Movement', '1966 Six Point Movement', '1969 Mass Uprising', '1971 Liberation War']
      },
      {
        name: 'Constitution',
        subtopics: ['Fundamental Rights', 'Articles & Amendments', 'Executive & Judiciary', 'Constitutional Bodies']
      },
      {
        name: 'Geography',
        subtopics: ['Rivers & Hills of Bangladesh', 'Climate & Weather', 'Mineral Resources & Agriculture', 'Divisions & Districts']
      },
      {
        name: 'Economy & National Achievements',
        subtopics: ['Mega Projects (Padma Bridge, Metro Rail)', 'GDP & Five Year Plans', 'Monetary Policy & Budget', 'Bangabandhu Satellite']
      }
    ]
  },
  {
    id: 'sub-gk',
    name: 'General Knowledge',
    examIds: ['exam-bcs', 'exam-bank', 'exam-primary', 'exam-medical'],
    topics: [
      {
        name: 'International Organizations',
        subtopics: ['UN & Specialized Agencies', 'World Bank & IMF', 'Regional Blocs (SAARC, ASEAN, EU)', 'International Treaties']
      },
      {
        name: 'World Geography',
        subtopics: ['Oceans, Straits & Canals', 'Capital & Currencies', 'Major Mountains & Deserts', 'Time Zones & Latitudes']
      }
    ]
  }
];

export const initialQuestions: Question[] = [
  // Science & Tech with MathJax / LaTeX
  {
    id: 'q-sc-1',
    text: 'Which organelle is known as the powerhouse of the cell and generates energy in the form of $\\text{ATP}$ (Adenosine Triphosphate)?',
    options: ['Ribosome', 'Mitochondria', 'Golgi Apparatus', 'Endoplasmic Reticulum'],
    correctOptionIndex: 1,
    explanation: 'Mitochondria generate most of the chemical energy through cellular respiration, synthesizing $\\text{ATP}$ molecules: $\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + 36\\text{ to }38\\text{ ATP}$.',
    subject: 'General Science',
    topic: 'Biology',
    subtopic: 'Cell Biology & Genetics',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Easy',
    tags: ['Biology', 'Cell', 'Basics', 'BCS'],
  },
  {
    id: 'q-sc-2',
    text: 'What is the primary gas found in the Sun\'s composition responsible for nuclear fusion?',
    options: ['Helium ($^4\\text{He}$)', 'Oxygen ($^{16}\\text{O}$)', 'Hydrogen ($^1\\text{H}$)', 'Nitrogen ($^{14}\\text{N}$)'],
    correctOptionIndex: 2,
    explanation: 'Hydrogen accounts for approximately $73\\%$ of the Sun\'s total mass. Nuclear fusion in the core converts Hydrogen into Helium via the proton-proton chain reaction: $4\\,^1\\text{H} \\rightarrow \\,^4\\text{He} + 2e^+ + 2\\nu_e + 26.7\\text{ MeV}$.',
    subject: 'General Science',
    topic: 'Astronomy & Environment',
    subtopic: 'Solar System & Universe',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Easy',
    tags: ['Astronomy', 'Sun', 'Physics'],
  },
  {
    id: 'q-sc-3',
    text: 'Which fundamental force is responsible for holding atomic nuclei together against electrostatic repulsion?',
    options: ['Gravitational Force', 'Electromagnetic Force', 'Weak Nuclear Force', 'Strong Nuclear Force'],
    correctOptionIndex: 3,
    explanation: 'The Strong Nuclear Force binds quarks together to form nucleons and overcomes Coulomb repulsion between positively charged protons at subatomic distances ($r \\le 10^{-15}\\text{ m}$).',
    subject: 'General Science',
    topic: 'Physics',
    subtopic: 'Nuclear Physics',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Medium',
    tags: ['Physics', 'Nuclear'],
  },
  {
    id: 'q-sc-4',
    text: 'Which element has the highest electrical conductivity ($\\\\sigma \\approx 6.30 \\times 10^7\\text{ S/m}$) at room temperature ($20^\\circ\\text{C}$)?',
    options: ['Copper ($\\text{Cu}$)', 'Gold ($\\text{Au}$)', 'Silver ($\\text{Ag}$)', 'Aluminum ($\\text{Al}$)'],
    correctOptionIndex: 2,
    explanation: 'Silver ($\\text{Ag}$) possesses the highest electrical conductivity ($\\\\sigma = 6.30 \\times 10^7\\text{ S/m}$) followed by Copper ($\\\\sigma = 5.96 \\times 10^7\\text{ S/m}$) and Gold ($\\\\sigma = 4.10 \\times 10^7\\text{ S/m}$).',
    subject: 'General Science',
    topic: 'Chemistry',
    subtopic: 'Periodic Table & Elements',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Medium',
    tags: ['Chemistry', 'Elements'],
  },

  // Mathematics & Quantitative with LaTeX formulas (Includes 5-option & Multi-Answer questions)
  {
    id: 'q-math-1',
    text: 'If a train traveling at $v = 60\\text{ km/h}$ crosses a telegraph post in $t = 9\\text{ seconds}$, what is the length of the train in meters?',
    options: ['$120\\text{ m}$', '$150\\text{ m}$', '$180\\text{ m}$', '$200\\text{ m}$', '$240\\text{ m}$'],
    correctOptionIndex: 1,
    explanation: 'First convert speed to $\\text{m/s}$:\n$$v = 60 \\times \\frac{5}{18} = \\frac{50}{3}\\text{ m/s}$$\nUsing distance formula $d = v \\times t$:\n$$L = \\frac{50}{3} \\times 9 = 150\\text{ meters}$$',
    subject: 'Mathematics',
    topic: 'Arithmetic',
    subtopic: 'Speed, Time & Distance',
    exam: 'Combined 10 Banks Officer & Senior Officer',
    difficulty: 'Medium',
    tags: ['Math', 'Speed', 'Bank', 'BCS'],
  },
  {
    id: 'q-math-multi-1',
    text: 'Which of the following numbers are real roots of the algebraic polynomial equation $x(x - 3)(x + 2) = 0$? (Select all correct options)',
    options: ['$x = 0$', '$x = 1$', '$x = 3$', '$x = -2$', '$x = 5$'],
    correctOptionIndex: 0,
    correctOptionIndices: [0, 2, 3],
    isMultiSelect: true,
    explanation: 'By the Zero Product Property, $x(x - 3)(x + 2) = 0$ holds when $x = 0$, $x - 3 = 0 \\implies x = 3$, or $x + 2 = 0 \\implies x = -2$. Therefore, Option A ($0$), Option C ($3$), and Option D ($-2$) are all correct.',
    subject: 'Mathematics',
    topic: 'Algebra',
    subtopic: 'Quadratic Equations',
    exam: 'GRE General Examination (Quant & Verbal)',
    difficulty: 'Medium',
    tags: ['Math', 'Algebra', 'Multi-Select', 'GRE'],
  },
  {
    id: 'q-math-multi-2',
    text: 'Which of the following numbers are prime numbers? (Select all that apply)',
    options: ['$17$', '$21$', '$29$', '$33$', '$41$'],
    correctOptionIndex: 0,
    correctOptionIndices: [0, 2, 4],
    isMultiSelect: true,
    explanation: '$17$, $29$, and $41$ are prime numbers because they have only two positive factors ($1$ and themselves). Meanwhile, $21 = 3 \\times 7$ and $33 = 3 \\times 11$ are composite.',
    subject: 'Mathematics',
    topic: 'Quantitative Reasoning',
    subtopic: 'Set Theory & Venn Diagrams',
    exam: 'Combined 10 Banks Officer & Senior Officer',
    difficulty: 'Easy',
    tags: ['Math', 'Primes', 'Bank', 'Multi-Select'],
  },
  {
    id: 'q-math-2',
    text: 'What is the sum of the interior angles of a convex polygon with $n = 8$ sides (octagon)?',
    options: ['$1080^\\circ$', '$1260^\\circ$', '$900^\\circ$', '$1440^\\circ$'],
    correctOptionIndex: 0,
    explanation: 'The formula for the sum of interior angles of an $n$-sided polygon is:\n$$S = (n - 2) \\times 180^\\circ$$\nFor an octagon ($n = 8$):\n$$S = (8 - 2) \\times 180^\\circ = 6 \\times 180^\\circ = 1080^\\circ$$',
    subject: 'Mathematics',
    topic: 'Geometry',
    subtopic: 'Polygons & Angles',
    exam: 'GRE General Examination (Quant & Verbal)',
    difficulty: 'Easy',
    tags: ['Math', 'Geometry', 'GRE'],
  },
  {
    id: 'q-math-3',
    text: 'In a class of $N = 50$ students, $n(P) = 30$ study Physics and $n(C) = 25$ study Chemistry. If $n(P \\cap C) = 10$ study both, how many study neither?',
    options: ['$5$', '$8$', '$10$', '$15$'],
    correctOptionIndex: 0,
    explanation: 'By Principle of Inclusion-Exclusion:\n$$n(P \\cup C) = n(P) + n(C) - n(P \\cap C) = 30 + 25 - 10 = 45$$\nStudents studying neither:\n$$N - n(P \\cup C) = 50 - 45 = 5$$',
    subject: 'Mathematics',
    topic: 'Quantitative Reasoning',
    subtopic: 'Set Theory & Venn Diagrams',
    exam: 'Combined 10 Banks Officer & Senior Officer',
    difficulty: 'Medium',
    tags: ['Math', 'Sets', 'Bank'],
  },
  {
    id: 'q-math-4',
    text: 'If $\\log_2 (x + 3) = 5$, what is the real value of $x$?',
    options: ['$29$', '$27$', '$32$', '$25$'],
    correctOptionIndex: 0,
    explanation: 'By exponential conversion of logarithm:\n$$\\log_b(y) = c \\iff y = b^c$$\n$$x + 3 = 2^5 = 32 \\implies x = 32 - 3 = 29$$',
    subject: 'Mathematics',
    topic: 'Algebra',
    subtopic: 'Logarithms & Exponents',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Hard',
    tags: ['Math', 'Logarithms', 'BCS'],
  },
  {
    id: 'q-math-5',
    text: 'Find the roots of the quadratic equation $2x^2 - 7x + 3 = 0$ using the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$:',
    options: ['$x = 3, \\frac{1}{2}$', '$x = -3, -\\frac{1}{2}$', '$x = 2, 3$', '$x = 1, \\frac{3}{2}$'],
    correctOptionIndex: 0,
    explanation: 'Here $a = 2, b = -7, c = 3$. Discriminant:\n$$\\Delta = (-7)^2 - 4(2)(3) = 49 - 24 = 25$$\n$$x = \\frac{7 \\pm \\sqrt{25}}{4} = \\frac{7 \\pm 5}{4}$$\nThus $x_1 = \\frac{12}{4} = 3$ and $x_2 = \\frac{2}{4} = \\frac{1}{2}$.',
    subject: 'Mathematics',
    topic: 'Algebra',
    subtopic: 'Quadratic Equations',
    exam: 'GRE General Examination (Quant & Verbal)',
    difficulty: 'Medium',
    tags: ['Math', 'Algebra', 'GRE', 'BCS'],
  },

  // Computer Science & ICT
  {
    id: 'q-cs-1',
    text: 'Which data structure operates strictly on a Last-In, First-Out ($\\text{LIFO}$) principle?',
    options: ['Queue ($\\text{FIFO}$)', 'Stack ($\\text{LIFO}$)', 'Array', 'Linked List'],
    correctOptionIndex: 1,
    explanation: 'A Stack follows $\\text{LIFO}$ where push operations append to top and pop operations retrieve from top in $O(1)$ time.',
    subject: 'Computer Science',
    topic: 'Data Structures',
    subtopic: 'Stacks & Queues',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Easy',
    tags: ['CS', 'DataStructures', 'ICT'],
  },
  {
    id: 'q-cs-2',
    text: 'What is the worst-case asymptotic time complexity $T(n)$ of standard QuickSort without randomized pivot selection?',
    options: ['$O(n \\log n)$', '$O(n^2)$', '$O(n)$', '$O(2^n)$'],
    correctOptionIndex: 1,
    explanation: 'When the pivot partitions into unbalanced subproblems of sizes $0$ and $n-1$, recurrence $T(n) = T(n-1) + O(n)$ yields worst-case time $O(n^2)$.',
    subject: 'Computer Science',
    topic: 'Algorithms',
    subtopic: 'Time Complexity $O(n)$',
    exam: 'Combined 10 Banks Officer & Senior Officer',
    difficulty: 'Medium',
    tags: ['CS', 'Algorithms', 'Bank'],
  },
  {
    id: 'q-cs-3',
    text: 'In $\\text{HTTP/2}$, what core feature enables multiplexing of bidirectional streams over a single $\\text{TCP}$ connection?',
    options: ['Gzip Header Compression', 'Binary Framing Layer', 'Server Push Only', 'WebSockets Tunneling'],
    correctOptionIndex: 1,
    explanation: 'The Binary Framing Layer in $\\text{HTTP/2}$ breaks communication into interleaved binary frames, eliminating Head-of-Line blocking at application level.',
    subject: 'Computer Science',
    topic: 'Networking',
    subtopic: 'HTTP/2 & Security Protocols',
    exam: 'Combined 10 Banks Officer & Senior Officer',
    difficulty: 'Hard',
    tags: ['CS', 'Web', 'Protocols'],
  },

  // English & Grammar
  {
    id: 'q-eng-1',
    text: 'Choose the most precise synonym for the word "EPHEMERAL":',
    options: ['Eternal', 'Transient', 'Substantial', 'Continuous'],
    correctOptionIndex: 1,
    explanation: 'Ephemeral means lasting for a very brief duration (transient, fleeting, evanescent).',
    subject: 'English',
    topic: 'Vocabulary',
    subtopic: 'GRE High Frequency Words',
    exam: 'GRE General Examination (Quant & Verbal)',
    difficulty: 'Medium',
    tags: ['English', 'Vocabulary', 'GRE', 'Bank'],
  },
  {
    id: 'q-eng-2',
    text: 'Identify the grammatically correct sentence adhering to Subject-Verb Agreement rules:',
    options: [
      'Neither of the candidate were present.',
      'Neither of the candidates was present.',
      'Neither of the candidates were present.',
      'Neither candidates was present.'
    ],
    correctOptionIndex: 1,
    explanation: '"Neither" used as a singular pronoun governing the prepositional phrase "of the candidates" requires a singular verb ("was").',
    subject: 'English',
    topic: 'Grammar',
    subtopic: 'Subject-Verb Agreement',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Hard',
    tags: ['English', 'Grammar', 'BCS'],
  },
  {
    id: 'q-eng-3',
    text: 'What is the meaning of the English idiom "To bite the bullet"?',
    options: [
      'To engage in armed combat',
      'To face an inevitable difficult situation with fortitude',
      'To make a rash miscalculation',
      'To withdraw from a negotiation'
    ],
    correctOptionIndex: 1,
    explanation: '"To bite the bullet" means to accept or confront a harsh, painful ordeal with courage and resolve.',
    subject: 'English',
    topic: 'Idioms & Phrases',
    subtopic: 'Common Idioms',
    exam: 'Primary Assistant Teacher & NTRCA',
    difficulty: 'Easy',
    tags: ['English', 'Idioms', 'Primary'],
  },

  // Bangladesh Affairs & History
  {
    id: 'q-bd-1',
    text: 'In which year was the historic Language Movement crowned with supreme sacrifice on 21st February, later recognized by UNESCO as International Mother Language Day?',
    options: ['1947', '1952', '1966', '1971'],
    correctOptionIndex: 1,
    explanation: 'On February 21, 1952 (৮ই ফাল্গুন ১৩৫৮), Salam, Barkat, Rafiq, Jabbar and others laid down their lives in Dhaka to establish Bangla as a state language.',
    subject: 'Bangladesh Affairs',
    topic: 'History',
    subtopic: '1952 Language Movement',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Easy',
    tags: ['Bangladesh', 'History', 'BCS'],
  },
  {
    id: 'q-bd-2',
    text: 'Which line of latitude passes through the central geographical territory of Bangladesh?',
    options: ['Tropic of Capricorn ($23.5^\\circ\\text{ S}$)', 'Equator ($0^\\circ$)', 'Tropic of Cancer ($23.5^\\circ\\text{ N}$)', 'Prime Meridian ($0^\\circ$)'],
    correctOptionIndex: 2,
    explanation: 'The Tropic of Cancer ($23^\\circ 30\'\\text{ N}$) passes across Bangladesh through Cumilla, Munshiganj, Faridpur, and Chuadanga districts.',
    subject: 'Bangladesh Affairs',
    topic: 'Geography',
    subtopic: 'Geography of Bangladesh',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Medium',
    tags: ['Bangladesh', 'Geography'],
  },
  {
    id: 'q-bd-3',
    text: 'Under which sector was the capital city Dhaka organized during the 1971 Liberation War of Bangladesh?',
    options: ['Sector 1', 'Sector 2', 'Sector 7', 'Sector 10'],
    correctOptionIndex: 1,
    explanation: 'Sector 2 encompassed Dhaka, Faridpur, and parts of Noakhali and Cumilla, commanded initially by Major Khaled Mosharraf and later by Major ATM Haider.',
    subject: 'Bangladesh Affairs',
    topic: 'History',
    subtopic: '1971 Liberation War',
    exam: '46th & 45th BCS Cadre Preliminary',
    difficulty: 'Hard',
    tags: ['Bangladesh', 'History', 'BCS'],
  }
];

export const initialBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: '46th BCS Preliminary Syllabus Breakdown & 60-Day Strategic Roadmap',
    slug: '46th-bcs-preliminary-syllabus-breakdown-60-day-roadmap',
    category: 'PREP_GUIDE',
    tags: ['46th BCS', 'BPSC', 'Syllabus', 'Study Plan', 'Strategy'],
    summary: 'A comprehensive topic-wise mark distribution analysis and high-yield scoring strategy for 46th BCS Preliminary 200-mark examination with audio overview.',
    content: `# 46th BCS Preliminary Syllabus Breakdown & Strategic Roadmap

The Bangladesh Public Service Commission (BPSC) conducts the BCS Preliminary Examination with a **200-mark Multiple Choice (MCQ)** structure. A structured, data-driven approach is essential for clearing the cut-off.

---

## 📊 Subject-wise Marks Weightage

| Subject | Allocated Marks | Target Score |
| :--- | :--- | :--- |
| **Bengali Language & Literature** | 35 Marks | $26 - 28$ |
| **English Language & Literature** | 35 Marks | $24 - 27$ |
| **Bangladesh Affairs** | 30 Marks | $23 - 26$ |
| **International Affairs** | 20 Marks | $14 - 16$ |
| **Geography, Environment & Disaster** | 10 Marks | $7 - 8$ |
| **General Science** | 15 Marks | $11 - 13$ |
| **Computer & Information Technology** | 15 Marks | $11 - 13$ |
| **Mathematical Reasoning** | 15 Marks | $12 - 14$ |
| **Mental Ability** | 15 Marks | $12 - 14$ |
| **Ethics, Values & Good Governance** | 10 Marks | $6 - 7$ |
| **Total** | **200 Marks** | **Safe Zone: 125+** |

---

## 🎯 Key Mathematical Formulae & Focus Areas

In the Mathematical Reasoning section ($15$ marks), mastering algebra and geometry formulae yields near-perfect accuracy:

### 1. Quadratic Equations & Roots
For the equation $ax^2 + bx + c = 0$, roots are given by:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
- Sum of roots: $\\alpha + \\beta = -\\frac{b}{a}$
- Product of roots: $\\alpha\\beta = \\frac{c}{a}$

### 2. Logarithmic Properties
$$\\log_a(xy) = \\log_a(x) + \\log_a(y)$$
$$\\log_a\\left(\\frac{x}{y}\\right) = \\log_a(x) - \\log_a(y)$$
$$\\log_{a^k}(x) = \\frac{1}{k}\\log_a(x)$$

---

## 💡 Daily Routine for Candidates
1. **Morning (2 Hours)**: English vocabulary & Grammar rule drills.
2. **Afternoon (3 Hours)**: Bangladesh & International Affairs current updates.
3. **Evening (2 Hours)**: Mathematical Reasoning practice & MathJax solution reviews.
4. **Night (1.5 Hours)**: Daily Model Test & Mistake Revision Notebook review.`,
    coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    audioTitle: '46th BCS Complete Roadmap & Mindset Strategy (Audio Lecture)',
    downloadAttachmentUrl: 'https://bpsc.gov.bd/sites/default/files/files/bpsc.portal.gov.bd/syllabus.pdf',
    downloadAttachmentLabel: 'Download Official 46th BCS Syllabus (PDF)',
    galleryImages: [
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80'
    ],
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    authorName: 'Rony Hossain (Cadre Specialist)',
    authorRole: 'Admin & Lead Instructor',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    targetExam: '46th & 45th BCS Cadre Preliminary',
    viewsCount: 1420,
    likesCount: 88,
    isFeatured: true,
    comments: [
      {
        id: 'c-1',
        authorName: 'Tanjim Ahmed',
        authorRole: 'BCS Aspirant',
        authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        content: 'This roadmap is exceptionally clear! The math shortcuts and audio lecture helped clarify my weak areas in quadratic equations.',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        likes: 12
      },
      {
        id: 'c-2',
        authorName: 'Nusrat Jahan',
        authorRole: 'Bank Job Aspirant',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        content: 'Downloaded the PDF attachment. Thank you ProshnoSiddhi team for verified guidelines!',
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        likes: 5
      }
    ]
  },
  {
    id: 'blog-2',
    title: 'Combined 10 Banks Officer Recruitment Circular 2026: Details & Preparation Guide',
    slug: 'combined-10-banks-officer-recruitment-circular-guide-2026',
    category: 'JOB_CIRCULAR',
    tags: ['Bank Job', 'Bank Recruitment', 'Circular', 'Senior Officer'],
    summary: 'Bankers’ Selection Committee (BSCS) announces recruitment for Officer and Senior Officer across Sonali, Janata, Agrani, Rupali, and Bangladesh Bank.',
    content: `# Combined 10 Banks Officer & Senior Officer Circular

The Bankers' Selection Committee Secretariat (BSCS) has published the official job circular for Combined Officer & Senior Officer positions.

---

## 📋 Key Details at a Glance

- **Organization**: Combined 10 Government Banks & Financial Institutions
- **Positions**: Senior Officer (General) & Officer (Cash/General)
- **Total Vacancies**: 2,850+ Posts
- **Application Deadline**: March 31, 2026
- **Salary Scale**: National Pay Scale Grade 9 (৳22,000 - ৳53,060) & Grade 10 (৳16,000 - ৳38,640)
- **Exam Pattern**: 100 Marks MCQ Preliminary $\\rightarrow$ 200 Marks Written $\\rightarrow$ Viva Voce

---

## 🧮 Bank Math Shortcut Techniques

Bank math questions emphasize speed in arithmetic and problem solving:

### Pipe & Cistern Shortcut
If Pipe A fills in $x$ hours and Pipe B fills in $y$ hours, together they fill in:
$$T = \\frac{xy}{x + y}\\text{ hours}$$

### Compound Interest Formula
$$A = P \\left(1 + \\frac{r}{100}\\right)^n$$
Where:
- $P$ = Principal amount
- $r$ = Annual interest rate
- $n$ = Number of compounding periods

Start taking targeted Bank Model Tests on ProshnoSiddhi BD to refine your speed and accuracy!`,
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    downloadAttachmentUrl: 'https://bb.org.bd/erecruitment/circular.pdf',
    downloadAttachmentLabel: 'Download Combined 10 Banks Official Circular (PDF)',
    galleryImages: [
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80'
    ],
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    authorName: 'Bank Prep Editorial Board',
    authorRole: 'Senior Banking Analyst',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    targetExam: 'Combined 10 Banks Officer & Senior Officer',
    applicationDeadline: '2026-03-31',
    salaryRange: '৳22,000 - ৳53,060 (Grade 9)',
    viewsCount: 2890,
    likesCount: 142,
    isFeatured: true,
    comments: [
      {
        id: 'c-3',
        authorName: 'Farhan Kabir',
        authorRole: 'Bank Officer Candidate',
        authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        content: 'Is there any age relaxation for general candidates? The salary scale grade 9 details are very motivating!',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        likes: 8
      }
    ]
  },
  {
    id: 'blog-3',
    title: 'Essential GRE Quantitative Reasoning Formulas with LaTeX Typesetting',
    slug: 'essential-gre-quantitative-reasoning-formulas-latex',
    category: 'TOPIC_NOTE',
    tags: ['GRE', 'Quantitative', 'Formulas', 'Math'],
    summary: 'Master key algebra, geometry, permutations, combinations, and probability formulas for a 165+ GRE Quant score.',
    content: `# Essential GRE Quantitative Reasoning Formula Sheet

Achieving a high quantitative score ($165-170$) requires fast algebraic manipulation and instant formula recall.

---

## 1. Combinatorics & Probability

### Permutations (Order Matters)
$$P(n, r) = \\frac{n!}{(n - r)!}$$

### Combinations (Order Does Not Matter)
$$C(n, r) = \\binom{n}{r} = \\frac{n!}{r!(n - r)!}$$

### Probability of Independent Events
$$P(A \\cap B) = P(A) \\times P(B)$$
$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$

---

## 2. Geometry Theorems

### Pythagorean Theorem
For a right-angled triangle with legs $a, b$ and hypotenuse $c$:
$$a^2 + b^2 = c^2$$

### Area & Circumference of Circle
$$\\text{Area} = \\pi r^2, \\quad \\text{Circumference} = 2\\pi r$$

### Volume of Cylinder & Cone
$$\\text{Vol}_{\\text{cylinder}} = \\pi r^2 h, \\quad \\text{Vol}_{\\text{cone}} = \\frac{1}{3}\\pi r^2 h$$`,
    coverImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    audioTitle: 'GRE Quantitative High-Yield Audio Masterclass & Trap Alerts',
    publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    authorName: 'Sadia Islam (Quant Lead)',
    authorRole: 'GRE & Math Specialist',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    targetExam: 'GRE General Examination (Quant & Verbal)',
    viewsCount: 950,
    likesCount: 64
  },
  {
    id: 'blog-4',
    title: 'Primary Assistant Teacher Recruitment 2026: Bengali Literature & Grammar Focus',
    slug: 'primary-assistant-teacher-recruitment-bengali-grammar-focus-2026',
    category: 'VIDEO_LECTURE',
    tags: ['Primary Teacher', 'DPE', 'Bengali Literature', 'Grammar', 'Lecture'],
    summary: 'Video lecture and breakdown of high-frequency Bengali grammar questions, Sandhi, Samas, and modern literature for Primary Assistant Teacher exams.',
    content: `# Primary Assistant Teacher Bengali Grammar Masterclass

Bengali grammar and literature comprise $20$ marks in the Primary Teacher recruitment exam. Securing full marks in this section is the most reliable path to selection.

---

## 📚 Essential Grammar Rules & Shortcuts

### ১. সন্ধি (Sandhi)
- **স্বরসন্ধি সূত্র**: অ/আ + ই/ঈ = এ (যেমন: নর + ইন্দ্র = নরেন্দ্র, শুভ + ইচ্ছা = শুভেচ্ছা)
- **ব্যঞ্জনসন্ধি সূত্র**: উৎ + চারণ = উচ্চারণ, দিক্ + অন্ত = দিগন্ত

### ২. সমাস (Samas)
- **দ্বিগু সমাস**: পূর্বপদ সংখ্যাবাচক ও সমষ্টি অর্থ বোঝায় (যেমন: ত্রিফলা, চৌরাস্তা)
- **দ্বন্দ্ব সমাস**: উভয় পদের অর্থ প্রধান (যেমন: পিতা-মাতা, দম্পতি)
- **বহুব্রীহি সমাস**: কোনো পদের অর্থ না বুঝিয়ে ভিন্ন কোনো অর্থ বোঝায় (যেমন: দশানন, পীতাম্বর)

---

## 🎯 Recommended Books & Syllabus
- নবম-দশম শ্রেণির বাংলা ব্যাকরণ ও নির্মিতি (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড)
- প্রশ্নসিদ্ধি বিগত বছরের ব্যাখ্যাসহ প্রশ্নব্যাংক

ভিডিও লেকচারটি সম্পূর্ণ দেখে নিচের মডেল টেস্টে অংশ নিন!`,
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    audioTitle: 'Bengali Grammar & Literature Quick Revision Audio',
    downloadAttachmentUrl: 'https://dpe.gov.bd/sites/default/files/primary_recruitment_syllabus.pdf',
    downloadAttachmentLabel: 'Download Primary Teacher Exam Blueprint (PDF)',
    galleryImages: [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80'
    ],
    publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    authorName: 'Prof. Anisur Rahman',
    authorRole: 'Head of Bengali Academic Desk',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    targetExam: 'Primary Assistant Teacher Examination',
    viewsCount: 3120,
    likesCount: 195,
    isFeatured: true,
    comments: [
      {
        id: 'c-4',
        authorName: 'Salma Begum',
        authorRole: 'Teacher Aspirant',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        content: 'The Samas shortcut table is crystal clear! Thank you sir for making Bengali grammar so easy to memorize.',
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        likes: 19
      }
    ]
  }
];


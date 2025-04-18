import { Question, QuestionDifficulty, UserContext, QuestionTemplate } from '@/types/assessment';

/**
 * QuestionGenerator class handles the generation of questions for the assessment
 * It uses templates and user context to create personalized questions
 */
export class QuestionGenerator {
  private templates: {
    aptitude: QuestionTemplate[];
    programming: QuestionTemplate[];
    employability: Record<string, QuestionTemplate[]>;
  } = {
    aptitude: [],
    programming: [],
    employability: {}
  };
  
  constructor() {
    this.loadTemplates();
  }
  
  /**
   * Generate a batch of questions for a specific section and category
   */
  generateQuestions(
    sectionType: string, 
    category: string, 
    count: number,
    userContext?: UserContext,
    difficulty?: QuestionDifficulty
  ): Question[] {
    const questions: Question[] = [];
    const sectionTemplates = this.getTemplatesForSection(sectionType, category);
    
    // Filter templates by difficulty if specified
    let availableTemplates = sectionTemplates;
    if (difficulty) {
      availableTemplates = sectionTemplates.filter(t => t.difficulty === difficulty);
      // If no matching templates, fall back to all templates for this section
      if (availableTemplates.length === 0) {
        availableTemplates = sectionTemplates;
      }
    }
    
    // Generate more questions than needed so we can prioritize them
    const targetCount = Math.min(count * 2, availableTemplates.length);
    const generatedCount = Math.max(count, Math.min(targetCount, 20)); // Generate between count and 20 questions
    
    // Generate questions
    for (let i = 0; i < generatedCount; i++) {
      // Select a random template, with weighting toward the user's interests
      const template = this.selectTemplateForUser(availableTemplates, userContext);
      
      if (template) {
        const question = this.generateFromTemplate(template, userContext);
        questions.push(question);
      } else {
        // Fall back to emergency questions if no templates available
        questions.push(this.generateEmergencyQuestion(sectionType, category, i));
      }
    }
    
    // Prioritize questions and return the top 'count' questions
    const prioritizedQuestions = this.prioritizeQuestions(questions, userContext);
    return prioritizedQuestions.slice(0, count);
  }
  
  /**
   * Get templates for a specific section and category
   */
  private getTemplatesForSection(sectionType: string, category?: string): QuestionTemplate[] {
    // For employability section, filter by category if specified
    if (sectionType === 'employability' && category && this.templates.employability[category]) {
      return this.templates.employability[category] || [];
    }
    
    // Otherwise return templates for the section type with type safety check
    if (sectionType === 'aptitude' || sectionType === 'programming') {
      return this.templates[sectionType] || [];
    }
    
    // Default empty array for unknown types
    return [];
  }
  
  /**
   * Select a template that's most relevant to the user's context
   */
  private selectTemplateForUser(
    templates: QuestionTemplate[], 
    userContext?: UserContext
  ): QuestionTemplate | null {
    if (!templates.length) return null;
    
    // If no user context, just return a random template
    if (!userContext || !userContext.interests?.length) {
      return templates[Math.floor(Math.random() * templates.length)];
    }
    
    // Try to find templates that match user interests
    const userInterests = userContext.interests.map(i => i.toLowerCase());
    
    const matchingTemplates = templates.filter(t => {
      const templateString = t.template.toLowerCase();
      return userInterests.some(interest => templateString.includes(interest));
    });
    
    // If matching templates found, select from those
    if (matchingTemplates.length > 0) {
      return matchingTemplates[Math.floor(Math.random() * matchingTemplates.length)];
    }
    
    // Otherwise fall back to random template
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  /**
   * Generate a question from a template
   */
  private generateFromTemplate(
    template: QuestionTemplate,
    userContext?: UserContext
  ): Question {
    // Generate variables for the template
    const variables = template.variables();
    
    // Replace variable placeholders in the template
    let questionText = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      questionText = questionText.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });
    
    // Replace user context placeholders with fallback values if missing
    if (userContext) {
      if (userContext.interests?.length) {
        const interest = userContext.interests[Math.floor(Math.random() * userContext.interests.length)];
        questionText = questionText.replace(/\{\{interest\}\}/g, interest);
      } else {
        questionText = questionText.replace(/\{\{interest\}\}/g, 'technology');
      }
      
      if (userContext.degree) {
        questionText = questionText.replace(/\{\{degree\}\}/g, userContext.degree);
      } else {
        questionText = questionText.replace(/\{\{degree\}\}/g, 'technical');
      }
      
      if (userContext.name) {
        questionText = questionText.replace(/\{\{name\}\}/g, userContext.name);
      } else {
        questionText = questionText.replace(/\{\{name\}\}/g, 'candidate');
      }
    } else {
      // If no user context at all, use generic replacements
      questionText = questionText.replace(/\{\{interest\}\}/g, 'technology');
      questionText = questionText.replace(/\{\{degree\}\}/g, 'technical');
      questionText = questionText.replace(/\{\{name\}\}/g, 'candidate');
    }
    
    // Clean up any remaining template variables with generic values
    questionText = this.cleanUpTemplateVariables(questionText);
    
    // Generate options based on the variables
    const { options, correctAnswer, explanation } = template.generateOptions(variables);
    
    let cleanedExplanation = explanation;
    if (explanation) {
      cleanedExplanation = this.cleanUpTemplateVariables(explanation);
    }
    
    // Create the question object
    return {
      id: `template-${template.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'mcq',
      question: questionText,
      options,
      correctAnswer,
      explanation: cleanedExplanation,
      difficulty: template.difficulty,
      category: template.category,
      timeLimit: 60
    };
  }
  
  /**
   * Clean up any remaining template variables with generic values
   */
  private cleanUpTemplateVariables(text: string): string {
    if (!text) return text;
    
    return text
      .replace(/\{\{college\}\}/g, 'university')
      .replace(/\{\{graduation\}\}/g, 'recent')
      .replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
      .replace(/\{\{company\}\}/g, 'technology company')
      .replace(/\{\{role\}\}/g, 'professional role')
      .replace(/\{\{[\w]+\}\}/g, 'relevant value'); // Catch any other template variables
  }
  
  /**
   * Generate an emergency question when templates are not available
   */
  private generateEmergencyQuestion(sectionType: string, category?: string, index = 0): Question {
    // Create a basic emergency question based on section type
    let question = '';
    let options = ['Option A', 'Option B', 'Option C', 'Option D'];
    let correctAnswer = 'Option B';
    let explanation = '';
    let difficulty: QuestionDifficulty = 'medium';
    
    if (sectionType === 'aptitude') {
      const aptitudeQuestions = [
        {
          question: 'If a train travels 360 kilometers in 3 hours, what is its speed?',
          options: ['90 km/h', '120 km/h', '180 km/h', '240 km/h'],
          correctAnswer: '120 km/h',
          explanation: 'Speed = Distance ÷ Time = 360 km ÷ 3 hr = 120 km/h',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'Which number comes next in the sequence: 2, 4, 8, 16, __?',
          options: ['24', '32', '36', '64'],
          correctAnswer: '32',
          explanation: 'Each number is doubled to get the next number: 2×2=4, 4×2=8, 8×2=16, 16×2=32',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'If the average of five numbers is 15, what is their sum?',
          options: ['45', '60', '75', '90'],
          correctAnswer: '75',
          explanation: 'Sum = Average × Count = 15 × 5 = 75',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'A tech company increased its workforce by 20% to reach 600 employees. How many employees did it have initially?',
          options: ['480', '500', '520', '540'],
          correctAnswer: '500',
          explanation: 'If 600 is 120% of the original, then the original is 600 ÷ 1.2 = 500 employees',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'If 3 programmers can debug 12 modules in 4 days, how many days will it take 6 programmers to debug 36 modules?',
          options: ['4 days', '6 days', '8 days', '12 days'],
          correctAnswer: '6 days',
          explanation: 'Work ratio: (3 programmers × 4 days) / 12 modules = 1 programmer-day per module. For 36 modules with 6 programmers: 36 × 1 ÷ 6 = 6 days',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'What is the next number in the pattern: 1, 4, 9, 16, 25, ...?',
          options: ['30', '36', '42', '49'],
          correctAnswer: '36',
          explanation: 'These are perfect squares: 1=1², 4=2², 9=3², 16=4², 25=5², so the next is 6² = 36',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'A software development team can complete a project in 10 days working 8 hours per day. How many days would it take if they worked 10 hours per day?',
          options: ['6 days', '8 days', '9 days', '12 days'],
          correctAnswer: '8 days',
          explanation: 'Total work = 10 days × 8 hours = 80 hours. Working 10 hours per day: 80 ÷ 10 = 8 days',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'In a team of 20 developers, the ratio of front-end to back-end developers is 3:2. How many front-end developers are there?',
          options: ['8', '10', '12', '15'],
          correctAnswer: '12',
          explanation: 'If the ratio is 3:2, then front-end developers make up 3/(3+2) = 3/5 of the team. 3/5 × 20 = 12 front-end developers',
          difficulty: 'medium' as QuestionDifficulty
        }
      ];
      
      const q = aptitudeQuestions[index % aptitudeQuestions.length];
      question = q.question;
      options = q.options;
      correctAnswer = q.correctAnswer;
      difficulty = q.difficulty;
      
    } else if (sectionType === 'programming') {
      const programmingQuestions = [
        {
          question: 'What is the time complexity of binary search?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          correctAnswer: 'O(log n)',
          explanation: 'Binary search divides the search interval in half each time, leading to logarithmic complexity.',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'Which of these is NOT a JavaScript data type?',
          options: ['String', 'Boolean', 'Character', 'Number'],
          correctAnswer: 'Character',
          explanation: 'JavaScript has strings, booleans, and numbers, but no separate character type. Characters are 1-length strings.',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'Which programming paradigm treats computation as the evaluation of mathematical functions?',
          options: ['Object-Oriented', 'Procedural', 'Functional', 'Imperative'],
          correctAnswer: 'Functional',
          explanation: 'Functional programming emphasizes the application of functions without changing state or mutable data.',
          difficulty: 'medium' as QuestionDifficulty
        },
        {
          question: 'What is the result of 5 + "5" in JavaScript?',
          options: ['10', '"55"', 'Error', '5'],
          correctAnswer: '"55"',
          explanation: 'In JavaScript, when a number and string are added, the number is converted to a string and concatenation occurs.',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'What does the acronym API stand for?',
          options: ['Application Programming Interface', 'Automated Program Integration', 'Application Process Interaction', 'Advanced Programming Implementation'],
          correctAnswer: 'Application Programming Interface',
          explanation: 'API stands for Application Programming Interface, which defines how software components should interact.',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'Which data structure operates on a LIFO (Last In, First Out) principle?',
          options: ['Queue', 'Stack', 'Linked List', 'Tree'],
          correctAnswer: 'Stack',
          explanation: 'A stack follows LIFO - the last element added is the first one to be removed.',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'What is the primary purpose of version control systems like Git?',
          options: ['Code compilation', 'Track changes to files over time', 'Database management', 'Web hosting'],
          correctAnswer: 'Track changes to files over time',
          explanation: 'Version control systems track file changes, allowing multiple people to collaborate and revert to previous versions if needed.',
          difficulty: 'easy' as QuestionDifficulty
        },
        {
          question: 'Which of the following is a statically typed language?',
          options: ['JavaScript', 'Python', 'Ruby', 'Java'],
          correctAnswer: 'Java',
          explanation: 'Java is statically typed, meaning variable types are checked at compile time rather than runtime.',
          difficulty: 'medium' as QuestionDifficulty
        }
      ];
      
      const q = programmingQuestions[index % programmingQuestions.length];
      question = q.question;
      options = q.options;
      correctAnswer = q.correctAnswer;
      difficulty = q.difficulty;
      
    } else {
      // Employability questions
      const employabilityQuestions = [
        {
          question: 'How would you prioritize tasks in a busy work environment?',
          options: [
            'Complete tasks in the order they were assigned', 
            'Consider both importance and urgency, focusing on high-impact tasks first', 
            'Start with the easiest tasks', 
            'Ask your manager to prioritize everything'
          ],
          correctAnswer: 'Consider both importance and urgency, focusing on high-impact tasks first',
          explanation: 'Effective task prioritization considers both urgency and importance to maximize productivity and impact.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'core'
        },
        {
          question: 'What is the most effective way to handle constructive criticism at work?',
          options: [
            'Defend your actions and explain why the criticism is unwarranted',
            'Listen actively, ask clarifying questions, and use it as an opportunity to improve',
            'Ignore it and continue with your preferred approach',
            'Immediately agree with all feedback without reflection'
          ],
          correctAnswer: 'Listen actively, ask clarifying questions, and use it as an opportunity to improve',
          explanation: 'Effective professionals view feedback as valuable information for growth rather than personal attacks.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'professional'
        },
        {
          question: 'When working in a team with diverse perspectives, what approach leads to the best outcomes?',
          options: [
            'Minimize disagreements by quickly adopting the most popular ideas',
            'Let the most experienced team member make all the decisions',
            'Actively encourage different viewpoints and integrate the best ideas from various perspectives',
            'Stick with your own ideas as they represent your authentic contribution'
          ],
          correctAnswer: 'Actively encourage different viewpoints and integrate the best ideas from various perspectives',
          explanation: 'Diversity of thought leads to innovation and better problem-solving when different perspectives are valued and integrated.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'teamwork'
        },
        {
          question: 'What is the most professional way to handle a situation where you made a significant mistake at work?',
          options: [
            'Downplay the mistake and hope no one notices',
            'Blame external factors or other team members',
            'Take responsibility, communicate promptly, propose a solution, and learn from it',
            'Overcompensate by working extra hours on unrelated tasks'
          ],
          correctAnswer: 'Take responsibility, communicate promptly, propose a solution, and learn from it',
          explanation: 'Professional accountability involves owning mistakes, addressing them proactively, and using them as learning opportunities.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'professional'
        },
        {
          question: 'Which approach is most effective for communicating technical information to non-technical stakeholders?',
          options: [
            'Use all technical terminology to demonstrate expertise',
            'Avoid all technical details completely',
            'Use analogies, visual aids, and focus on business impact rather than technical details',
            'Suggest they learn the technical background before the discussion'
          ],
          correctAnswer: 'Use analogies, visual aids, and focus on business impact rather than technical details',
          explanation: 'Effective communication adapts to the audience\'s knowledge level and focuses on what matters most to them.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'communication'
        },
        {
          question: 'What is the best way to handle a situation where you disagree with your manager\'s approach to a problem?',
          options: [
            'Implement your own approach without telling them',
            'Immediately escalate to their supervisor',
            'Respectfully discuss your concerns privately, providing alternative solutions and rationale',
            'Comply without question regardless of consequences'
          ],
          correctAnswer: 'Respectfully discuss your concerns privately, providing alternative solutions and rationale',
          explanation: 'Constructive dialogue that focuses on the goal rather than personal disagreement demonstrates professionalism and problem-solving ability.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'communication'
        },
        {
          question: 'How should you approach continuous professional development in your career?',
          options: [
            'Focus only on the skills directly needed for your current role',
            'Wait for your employer to provide training opportunities',
            'Proactively seek learning opportunities through various channels, both within and outside your current specialization',
            'Focus exclusively on getting certifications regardless of their relevance'
          ],
          correctAnswer: 'Proactively seek learning opportunities through various channels, both within and outside your current specialization',
          explanation: 'Career growth requires ongoing learning across multiple dimensions, including technical skills, soft skills, and industry knowledge.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'professional'
        },
        {
          question: 'What is the most effective approach when a team project is falling behind schedule?',
          options: [
            'Work longer hours without adjusting the scope or schedule',
            'Blame team members who you believe are underperforming',
            'Reassess priorities, identify bottlenecks, adjust scope if necessary, and communicate transparently with stakeholders',
            'Rush to complete everything with reduced quality'
          ],
          correctAnswer: 'Reassess priorities, identify bottlenecks, adjust scope if necessary, and communicate transparently with stakeholders',
          explanation: 'Professional project management requires adaptability and transparent communication when challenges arise.',
          difficulty: 'medium' as QuestionDifficulty,
          category: 'problem_solving'
        }
      ];
      
      // Try to find a question that matches the requested category
      const matchingQuestions = category 
        ? employabilityQuestions.filter(q => q.category === category)
        : employabilityQuestions;
        
      const q = matchingQuestions.length > 0 
        ? matchingQuestions[index % matchingQuestions.length] 
        : employabilityQuestions[index % employabilityQuestions.length];
        
      question = q.question;
      options = q.options;
      correctAnswer = q.correctAnswer;
      difficulty = q.difficulty;
    }
    
    return {
      id: `emergency-${sectionType}-${category || 'general'}-${index}-${Date.now()}`,
      type: 'mcq',
      question,
      options,
      correctAnswer,
      explanation: `Emergency question for ${sectionType} section.`,
      difficulty,
      category: category || sectionType,
      timeLimit: 60
    };
  }
  
  /**
   * Load all question templates
   */
  private loadTemplates() {
    // Load aptitude templates
    this.templates.aptitude = this.getAptitudeTemplates();
    
    // Load programming templates
    this.templates.programming = this.getProgrammingTemplates();
    
    // Load employability templates by category
    this.templates.employability = {
      core: this.getEmployabilityTemplates('core'),
      soft: this.getEmployabilityTemplates('soft'),
      communication: this.getEmployabilityTemplates('communication'),
      teamwork: this.getEmployabilityTemplates('teamwork'),
      leadership: this.getEmployabilityTemplates('leadership'),
      problem_solving: this.getEmployabilityTemplates('problem_solving'),
      professional: this.getEmployabilityTemplates('professional'),
      domain: this.getEmployabilityTemplates('domain')
    };
  }
  
  /**
   * Get aptitude question templates
   */
  private getAptitudeTemplates(): QuestionTemplate[] {
    return [
      {
        id: 'apt-numeric-1',
        template: 'If a team of {{n}} developers can complete a project in {{days}} days, how many days would it take {{m}} developers to complete the same project?',
        category: 'numerical',
        difficulty: 'medium',
        variables: () => ({
          n: 2 + Math.floor(Math.random() * 8), // 2-10 developers
          days: 10 + Math.floor(Math.random() * 20), // 10-30 days
          m: 4 + Math.floor(Math.random() * 12) // 4-16 developers
        }),
        generateOptions: (vars: Record<string, any>) => {
          const { n, days, m } = vars;
          const correctAnswer = Math.round((n * days) / m);
          
          // Create options with greater variation to avoid duplicates
          let option1 = Math.max(1, correctAnswer - Math.ceil(correctAnswer * 0.4));
          let option2 = Math.max(1, correctAnswer - Math.ceil(correctAnswer * 0.2)); 
          const option3 = correctAnswer;
          let option4 = correctAnswer + Math.ceil(correctAnswer * 0.3);
          
          // Ensure all values are unique
          let options = [option1, option2, option3, option4];
          
          // Check for duplicates and adjust until all are unique
          for (let i = 0; i < options.length; i++) {
            for (let j = i + 1; j < options.length; j++) {
              if (options[i] === options[j]) {
                // Adjust the duplicate value
                if (j === 3) { // option4
                  options[j] += 1;
                } else if (j === 1) { // option2
                  options[j] = Math.max(1, options[j] - 1);
                } else {
                  // For any other case, just add or subtract based on position
                  options[j] = j < 2 ? Math.max(1, options[j] - 1) : options[j] + 1;
                }
                // Start over to check for any new duplicates
                i = -1;
                break;
              }
            }
            if (i === -1) break;
          }
          
          return {
            options: [
              `${options[0]} days`,
              `${options[1]} days`,
              `${options[2]} days`,
              `${options[3]} days`
            ],
            correctAnswer: `${correctAnswer} days`,
            explanation: `Using the work-rate formula: If ${n} developers take ${days} days, then ${m} developers will take (${n} × ${days}) ÷ ${m} = ${correctAnswer} days.`
          };
        }
      },
      {
        id: 'apt-numeric-2',
        template: 'A software company grows by {{growthRate}}% each year. If it currently has {{startSize}} employees, approximately how many employees will it have after {{years}} years?',
        category: 'numerical',
        difficulty: 'medium',
        variables: () => ({
          startSize: 50 + Math.floor(Math.random() * 150), // 50-200 employees
          growthRate: 5 + Math.floor(Math.random() * 25), // 5-30% growth
          years: 2 + Math.floor(Math.random() * 4) // 2-5 years
        }),
        generateOptions: (vars: Record<string, any>) => {
          const { startSize, growthRate, years } = vars;
          const growthFactor = 1 + (growthRate / 100);
          const correctAnswer = Math.round(startSize * Math.pow(growthFactor, years));
          
          return {
            options: [
              `${Math.round(correctAnswer * 0.7)} employees`,
              `${Math.round(correctAnswer * 0.9)} employees`,
              `${correctAnswer} employees`,
              `${Math.round(correctAnswer * 1.2)} employees`
            ],
            correctAnswer: `${correctAnswer} employees`,
            explanation: `Using the compound growth formula: ${startSize} × (1 + ${growthRate}/100)^${years} = ${correctAnswer} employees.`
          };
        }
      },
      {
        id: 'apt-sequence-1',
        template: 'What is the next number in this sequence: {{sequence}}?',
        category: 'pattern',
        difficulty: 'medium',
        variables: () => {
          // Generate a sequence with a pattern
          const patterns = [
            // Arithmetic sequence
            {
              start: Math.floor(Math.random() * 10),
              diff: 1 + Math.floor(Math.random() * 5),
              formula: "adding a constant value to each term",
              generateSequence: (start: number, diff: number) => {
                const seq = [];
                let current = start;
                for (let i = 0; i < 5; i++) {
                  seq.push(current);
                  current += diff;
                }
                return {
                  sequence: seq.join(', '),
                  next: current,
                  formula: `+${diff} to each term`
                };
              }
            },
            // Geometric sequence
            {
              start: 1 + Math.floor(Math.random() * 3),
              ratio: 2 + Math.floor(Math.random() * 2),
              formula: "multiplying each term by a constant factor",
              generateSequence: (start: number, ratio: number) => {
                const seq = [];
                let current = start;
                for (let i = 0; i < 5; i++) {
                  seq.push(current);
                  current *= ratio;
                }
                return {
                  sequence: seq.join(', '),
                  next: current,
                  formula: `×${ratio} each term`
                };
              }
            }
          ];
          
          const pattern = patterns[Math.floor(Math.random() * patterns.length)];
          if ('diff' in pattern) {
            return pattern.generateSequence(pattern.start, pattern.diff);
          } else if ('ratio' in pattern) {
            return pattern.generateSequence(pattern.start, pattern.ratio);
          }
          
          // Fallback
          return {
            sequence: "2, 4, 6, 8, 10",
            next: 12,
            formula: "+2 to each term"
          };
        },
        generateOptions: (vars: Record<string, any>) => {
          const next = vars.next;
          // Handle the case where next might be undefined
          const actualNext = typeof next === 'number' ? next : 0;
          
          // Generate wrong options that are close to the correct answer
          // but ensure they are unique by adding index-based variation
          let wrongOptions = [
            Math.floor(actualNext * 0.8) + 1,
            Math.floor(actualNext * 1.2) + 2,
            Math.ceil(actualNext * 0.9) + 3
          ];
          
          // Create options array with the correct answer
          const options = [...wrongOptions, actualNext].map(String);
          
          return {
            options,
            correctAnswer: String(actualNext),
            explanation: `The sequence follows the pattern of ${vars.formula || "increasing by a constant amount"}. The next number is ${actualNext}.`
          };
        }
      },
      {
        id: 'apt-numeric-3',
        template: 'In a survey of {{total}} software engineers, {{percent}}% reported using {{technology}}. How many engineers use {{technology}}?',
        category: 'numerical',
        difficulty: 'easy',
        variables: () => ({
          total: 100 + Math.floor(Math.random() * 900), // 100-1000 engineers
          percent: 20 + Math.floor(Math.random() * 60), // 20-80%
          technology: ['JavaScript', 'Python', 'Java', 'TypeScript', 'C#', 'React', 'Angular'][Math.floor(Math.random() * 7)]
        }),
        generateOptions: (vars: Record<string, any>) => {
          const { total, percent } = vars;
          const correctAnswer = Math.round((percent / 100) * total);
          
          // Generate diverse options
          const options = [
            Math.round(correctAnswer * 0.75),
            Math.round(correctAnswer * 0.9),
            correctAnswer,
            Math.round(correctAnswer * 1.25)
          ];
          
          return {
            options: options.map(String),
            correctAnswer: String(correctAnswer),
            explanation: `${percent}% of ${total} is calculated as: ${total} × ${percent}/100 = ${correctAnswer} engineers.`
          };
        }
      },
      {
        id: 'apt-logical-1',
        template: 'If all A are B, and all B are C, which of the following must be true?',
        category: 'logical',
        difficulty: 'medium',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            'All A are C',
            'All C are A',
            'No A are C',
            'Some C are not A'
          ],
          correctAnswer: 'All A are C',
          explanation: 'If all A are B, and all B are C, then all A must also be C through transitive reasoning.'
        })
      }
    ];
  }
  
  /**
   * Get programming question templates
   */
  private getProgrammingTemplates(): QuestionTemplate[] {
    return [
      {
        id: 'prog-complexity-1',
        template: 'What is the time complexity of searching for an element in a balanced binary search tree with n elements?',
        category: 'algorithms',
        difficulty: 'medium',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            'O(1)',
            'O(log n)',
            'O(n)',
            'O(n log n)'
          ],
          correctAnswer: 'O(log n)',
          explanation: 'Searching in a balanced binary search tree involves traversing at most one path from root to leaf, which has a height of log(n).'
        })
      },
      {
        id: 'prog-concepts-1',
        template: 'Which of the following is NOT a principle of Object-Oriented Programming?',
        category: 'concepts',
        difficulty: 'easy',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            'Encapsulation',
            'Linear Execution',
            'Inheritance',
            'Polymorphism'
          ],
          correctAnswer: 'Linear Execution',
          explanation: 'The four main principles of OOP are Encapsulation, Inheritance, Polymorphism, and Abstraction. Linear Execution is not an OOP principle.'
        })
      },
      {
        id: 'prog-debugging-1',
        template: 'What would be the output of the following code snippet?\n\nlet x = 5;\nlet y = "10";\nconsole.log(x + y);',
        category: 'debugging',
        difficulty: 'easy',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            '15',
            '"510"',
            'Error',
            'undefined'
          ],
          correctAnswer: '"510"',
          explanation: 'In JavaScript, when you add a number and a string, the number is converted to a string and the two strings are concatenated. So 5 + "10" becomes "5" + "10", which equals "510".'
        })
      }
    ];
  }
  
  /**
   * Get employability question templates for a specific category
   */
  private getEmployabilityTemplates(category?: string): QuestionTemplate[] {
    // Common employability templates
    const commonTemplates = [
      {
        id: 'emp-general-1',
        template: 'How would you stay current with rapidly evolving trends in {{interest}}?',
        category: category || 'general',
        difficulty: 'medium',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            'Rely solely on what you learned in your degree program',
            'Follow industry blogs, participate in communities, attend webinars, and build personal projects',
            'Wait for your employer to provide training',
            'Focus only on what\'s directly relevant to your current job tasks'
          ],
          correctAnswer: 'Follow industry blogs, participate in communities, attend webinars, and build personal projects',
          explanation: 'Continuous learning through multiple channels helps professionals stay current in rapidly evolving fields.'
        })
      },
      {
        id: 'emp-general-2',
        template: 'When working on a team project with a tight deadline, what should you do if you realize you won\'t be able to complete your assigned tasks on time?',
        category: category || 'general',
        difficulty: 'medium',
        variables: () => ({}),
        generateOptions: () => ({
          options: [
            'Work overtime without telling anyone and try to finish anyway',
            'Communicate with your team as soon as possible, explain the situation, and discuss possible solutions',
            'Complete what you can and let the team discover the incomplete work at the deadline',
            'Ask another team member to do your work for you'
          ],
          correctAnswer: 'Communicate with your team as soon as possible, explain the situation, and discuss possible solutions',
          explanation: 'Early communication about potential delays allows the team to collaborate on solutions, reassign tasks, or adjust expectations before the deadline.'
        })
      }
    ];
  
    // Category-specific templates
    const categoryTemplates: Record<string, QuestionTemplate[]> = {
      'core': [
        {
          id: 'emp-core-1',
          template: 'In your role as a {{interest}} professional, how would you prioritize these tasks?',
          category: 'core',
          difficulty: 'medium',
          variables: () => ({}),
          generateOptions: () => ({
            options: [
              'Based on deadline proximity only',
              'Consider both importance and urgency, focusing on high-impact tasks first',
              'Complete the easiest tasks first to build momentum',
              'Ask your manager to prioritize everything for you'
            ],
            correctAnswer: 'Consider both importance and urgency, focusing on high-impact tasks first',
            explanation: 'Effective professionals prioritize tasks based on both importance and urgency, which maximizes productivity and ensures critical work is completed on time.'
          })
        }
      ],
      'soft': [
        {
          id: 'emp-soft-1',
          template: 'A colleague consistently interrupts you during team meetings. What is the most professional way to handle this situation?',
          category: 'soft',
          difficulty: 'medium',
          variables: () => ({}),
          generateOptions: () => ({
            options: [
              'Interrupt them back to teach them a lesson',
              'Speak to them privately after the meeting and express how their behavior affects you and the team',
              'Complain to your manager about their behavior',
              'Stop contributing in meetings to avoid being interrupted'
            ],
            correctAnswer: 'Speak to them privately after the meeting and express how their behavior affects you and the team',
            explanation: 'Addressing the issue privately and directly with a focus on impact rather than blame is the most professional approach to interpersonal conflicts.'
          })
        }
      ],
      'communication': [
        {
          id: 'emp-comm-1',
          template: 'When explaining a complex technical concept to a non-technical stakeholder, which approach is most effective?',
          category: 'communication',
          difficulty: 'medium',
          variables: () => ({}),
          generateOptions: () => ({
            options: [
              'Use all the technical terminology to demonstrate your expertise',
              'Use analogies and simple language, focusing on business impact rather than technical details',
              'Provide a detailed technical document and ask them to study it',
              'Tell them they don\'t need to understand the technical aspects'
            ],
            correctAnswer: 'Use analogies and simple language, focusing on business impact rather than technical details',
            explanation: 'Effective technical communication adapts to the audience\'s level of technical understanding and focuses on what matters to them - typically the business impact or user experience.'
          })
        }
      ]
    };
    
    // Return category-specific templates if they exist, otherwise return common templates
    return (category && categoryTemplates[category]) 
      ? [...categoryTemplates[category], ...commonTemplates]
      : commonTemplates;
  }
  
  /**
   * Prioritize questions based on relevance to user, diversity, and quality
   */
  private prioritizeQuestions(questions: Question[], userContext?: UserContext): Question[] {
    // Create a copy to avoid modifying the original array
    const sortedQuestions = [...questions];
    
    // Score each question for prioritization
    const questionScores = sortedQuestions.map(question => {
      let score = 0;
      
      // Boost score for questions that match user interests
      if (userContext?.interests?.length) {
        const userInterests = userContext.interests.map(i => i.toLowerCase());
        const questionText = question.question.toLowerCase();
        
        for (const interest of userInterests) {
          if (questionText.includes(interest)) {
            score += 10;
            break;
          }
        }
      }
      
      // Adjust score based on difficulty (medium difficulty gets highest priority)
      if (question.difficulty === 'medium') score += 5;
      else if (question.difficulty === 'easy') score += 3;
      else if (question.difficulty === 'hard') score += 4;
      
      // Promote questions with complete explanations
      if (question.explanation && question.explanation.length > 20) {
        score += 3;
      }
      
      // Promote questions with more options (better multiple choice)
      if (question.options && question.options.length >= 4) {
        score += 2;
      }
      
      // Penalize emergency questions
      if (question.id.includes('emergency')) {
        score -= 10;
      }
      
      return { question, score };
    });
    
    // Sort by score (descending)
    questionScores.sort((a, b) => b.score - a.score);
    
    // Get unique questions (no duplicate question text)
    const uniqueQuestions: Question[] = [];
    const seenQuestionTexts = new Set<string>();
    
    for (const { question } of questionScores) {
      // Skip duplicate questions
      if (seenQuestionTexts.has(question.question)) continue;
      
      uniqueQuestions.push(question);
      seenQuestionTexts.add(question.question);
    }
    
    return uniqueQuestions;
  }

  /**
   * Helper function to ensure unique options
   * 
   * This addresses the issue with duplicate option values like "2 days"
   */
  private ensureUniqueOptions(options: string[]): string[] {
    // If there are fewer than 2 options, or all options are already unique, return as is
    if (options.length < 2 || new Set(options).size === options.length) {
      return options;
    }

    // Make duplicates unique by adding numbering
    const seen = new Set<string>();
    return options.map((option) => {
      if (!seen.has(option)) {
        seen.add(option);
        return option;
      } else {
        // For duplicates, add a suffix to make them unique
        let count = 1;
        let uniqueOption = `${option} (#${count})`;
        while (seen.has(uniqueOption)) {
          count++;
          uniqueOption = `${option} (#${count})`;
        }
        seen.add(uniqueOption);
        return uniqueOption;
      }
    });
  }

  /**
   * Process and filter questions for a specific section
   */
  processQuestionsForSection(questions: Question[], type: string): Question[] {
    console.log(`Processing ${questions.length} ${type} questions`);
    
    // Score questions for quality
    const questionScores = questions.map(question => {
      let score = 0;
      
      // Prefer questions with proper categories
      if (question.category && question.category.length > 0) {
        score += 2;
      }
      
      // Prefer questions with difficulty specified
      if (question.difficulty) {
        score += 1;
      }
      
      // Prefer questions with timeLimit specified
      if (question.timeLimit && question.timeLimit > 0) {
        score += 1;
      }
      
      // Promote questions with complete explanations
      if (question.explanation && question.explanation.length > 20) {
        score += 3;
      }
      
      // Promote questions with more options (better multiple choice)
      if (question.options && question.options.length >= 4) {
        score += 2;
      }
      
      // Penalize emergency questions
      if (question.id && question.id.includes('emergency')) {
        score -= 10;
      }
      
      return { question, score };
    });
    
    // Sort by score (descending)
    questionScores.sort((a, b) => b.score - a.score);
    
    // Get unique questions (no duplicate question text)
    const uniqueQuestions: Question[] = [];
    const seenQuestionTexts = new Set<string>();
    
    for (const { question } of questionScores) {
      // Skip duplicate questions
      if (seenQuestionTexts.has(question.question)) continue;
      
      // Ensure options are unique before adding
      if (question.options && question.options.length > 0) {
        question.options = this.ensureUniqueOptions(question.options);
      }
      
      uniqueQuestions.push(question);
      seenQuestionTexts.add(question.question);
    }
    
    return uniqueQuestions;
  }
}

// Export singleton instance
export const questionGenerator = new QuestionGenerator(); 
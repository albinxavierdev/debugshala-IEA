// Generate a mock report when API fails or for testing
const generateMockReport = (formData: FormData, scores: AssessmentResult['scores']): AssessmentResult => {
  return {
    userId: "user-" + Math.floor(Math.random() * 1000000),
    timestamp: new Date().toISOString(),
    formData,
    scores,
    sectionDetails: {
      aptitude: {
        totalQuestions: 10,
        correctAnswers: 7,
        accuracy: 70,
        strengths: ["Logical reasoning", "Pattern recognition"],
        weakAreas: ["Numerical computation", "Spatial reasoning"]
      },
      programming: {
        totalQuestions: 10,
        correctAnswers: 6,
        accuracy: 60,
        strengths: ["Algorithms", "Data structures"],
        weakAreas: ["System design", "Optimization"]
      },
      employability: {
        totalQuestions: 10,
        correctAnswers: 8,
        accuracy: 80,
        softSkillsScore: 75,
        professionalSkillsScore: 70,
        aiLiteracyScore: 65,
        strengths: ["Communication", "Adaptability"],
        weakAreas: ["Leadership", "Project management"]
      }
    },
    outcome: "Pass",
    skillReadinessLevel: "Intermediate",
    recommendations: {
      skills: [
        "Advanced algorithm optimization",
        "Frontend performance tuning",
        "Data structure implementation",
        "System design for scalability",
        "Cloud deployment strategies"
      ],
      courses: [
        "Advanced Data Structures & Algorithms",
        "Full Stack Development Bootcamp",
        "System Design for Enterprise Applications",
        "Professional Communication for Tech Leaders",
        "Cloud Engineering Certification"
      ],
      careerPaths: [
        "Full Stack Developer",
        "Software Engineer",
        "Technical Lead",
        "DevOps Engineer",
        "Backend Developer"
      ],
      aptitudeResources: {
        books: [
          "Cracking the Coding Interview",
          "Problem Solving Strategies",
          "Thinking Fast and Slow"
        ],
        platforms: [
          "LeetCode",
          "HackerRank",
          "CodeSignal"
        ],
        practiceGuide: "Focus on algorithmic thinking and pattern recognition"
      },
      programmingResources: {
        courses: [
          "Data Structures and Algorithms",
          "System Design Fundamentals",
          "Clean Code Principles"
        ],
        platforms: [
          "GitHub",
          "Stack Overflow",
          "Dev.to"
        ],
        topicsToStudy: ["Advanced algorithms", "Design patterns", "Architecture"]
      },
      employabilityResources: {
        courses: [
          "Professional Communication",
          "Team Leadership",
          "Project Management"
        ],
        activities: [
          "Join open source projects",
          "Participate in hackathons",
          "Attend tech meetups"
        ]
      },
      nextAction: "Focus on strengthening technical fundamentals while building real-world projects"
    },
    detailedAnalysis: {
      strengths: [
        "Strong problem-solving abilities",
        "Good technical fundamentals",
        "Analytical thinking",
        "Adaptability to different technologies",
        "Attention to detail"
      ],
      areasForImprovement: [
        "Advanced algorithm optimization",
        "Complex data structure implementation",
        "System design for large-scale applications",
        "Technical communication skills",
        "Leadership in technical projects"
      ],
      skillGaps: [
        "Performance optimization techniques",
        "Distributed systems design",
        "Advanced architectural patterns",
        "Technical documentation skills",
        "DevOps and deployment automation"
      ],
      industryComparison: {
        aptitude: 70,
        programming: 65,
        softSkills: 75,
        overallGap: 25
      }
    }
  };
}; 
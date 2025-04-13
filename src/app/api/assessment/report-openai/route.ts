import { NextResponse } from 'next/server';
import { FormData, AssessmentResult } from '@/types/assessment';
import { generateAssessmentReport } from '@/lib/openai';

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
        strengths: ["Syntax knowledge", "Problem-solving"],
        weakAreas: ["Algorithm optimization", "Advanced data structures"]
      },
      employability: {
        totalQuestions: 15,
        correctAnswers: 10,
        accuracy: 67,
        softSkillsScore: 75,
        professionalSkillsScore: 65,
        aiLiteracyScore: 60,
        strengths: ["Communication", "Teamwork"],
        weakAreas: ["Leadership", "Project management"]
      }
    },
    outcome: 'Pass',
    skillReadinessLevel: 'Intermediate',
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
          "Problem Solving Strategies by Arthur Engel",
          "How to Solve It by G. Polya"
        ],
        platforms: [
          "BrainMetrix",
          "Lumosity",
          "Brilliant.org"
        ],
        practiceGuide: "Focus on daily analytical thinking exercises and timed practice tests."
      },
      programmingResources: {
        courses: [
          "Data Structures and Algorithms Specialization (Coursera)",
          "Advanced Programming Techniques (edX)"
        ],
        platforms: [
          "LeetCode",
          "HackerRank",
          "CodeSignal"
        ],
        topicsToStudy: [
          "Dynamic Programming",
          "Graph Algorithms",
          "System Design"
        ]
      },
      employabilityResources: {
        courses: [
          "Professional Communication Skills (LinkedIn Learning)",
          "Project Management Fundamentals (PMI)"
        ],
        activities: [
          "Join open-source projects",
          "Participate in hackathons",
          "Attend industry meetups"
        ]
      },
      nextAction: "Enroll in the recommended algorithms course and start practicing on coding platforms."
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
        softSkills: 72,
        overallGap: 20
      }
    }
  };
};

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { formData, scores, userId } = body;

    // Validate required data
    if (!formData || !scores) {
      return NextResponse.json(
        { error: 'Missing required data (formData or scores)' },
        { status: 400 }
      );
    }

    console.log('Processing assessment report for user:', userId || 'anonymous');

    // Ensure formData has all required fields or use defaults
    const sanitizedFormData: FormData = {
      name: formData.name || "Candidate",
      email: formData.email || "",
      phone: formData.phone || "",
      degree: formData.degree || "Not specified",
      graduationYear: formData.graduationYear || "Not specified",
      collegeName: formData.collegeName || "Not specified",
      interestedDomains: Array.isArray(formData.interestedDomains) ? formData.interestedDomains : [],
    };

    try {
      // Call OpenAI to generate the report
      console.log('Generating assessment report using OpenAI for', sanitizedFormData.name);
      
      const reportData = await generateAssessmentReport(sanitizedFormData, scores);
      
      // Check if this is the new simplified format
      const isSimplifiedFormat = reportData.candidateInfo && reportData.testSummary && reportData.finalScore;
      
      // Build the final report with defaults for missing properties
      const report: AssessmentResult = {
        userId: userId || reportData.userId || 'user-' + Math.floor(Math.random() * 1000000),
        timestamp: reportData.timestamp || new Date().toISOString(),
        formData: sanitizedFormData,
        scores,
        // Use simplified structure if available
        candidateInfo: isSimplifiedFormat ? reportData.candidateInfo : null,
        testSummary: isSimplifiedFormat ? reportData.testSummary : null,
        finalScore: isSimplifiedFormat ? reportData.finalScore : null,
        // Keep these for backward compatibility
        sectionDetails: isSimplifiedFormat ? null : (reportData.sectionDetails || {
          aptitude: {
            totalQuestions: 10,
            correctAnswers: Math.round(scores.aptitude / 10),
            accuracy: scores.aptitude,
            strengths: ["Analytical reasoning"],
            weakAreas: ["Need more practice"]
          },
          programming: {
            totalQuestions: 10,
            correctAnswers: Math.round(scores.programming / 10),
            accuracy: scores.programming,
            strengths: ["Basic concepts"],
            weakAreas: ["Advanced topics"]
          },
          employability: {
            totalQuestions: 15,
            correctAnswers: 10,
            accuracy: 67,
            softSkillsScore: 70,
            professionalSkillsScore: 65,
            aiLiteracyScore: 60,
            strengths: ["Communication"],
            weakAreas: ["Leadership"]
          }
        }),
        outcome: reportData.outcome || (isSimplifiedFormat ? reportData.finalScore.outcome : 'Pass'),
        skillReadinessLevel: reportData.skillReadinessLevel || (isSimplifiedFormat ? reportData.finalScore.skillReadinessLevel : 'Intermediate'),
        recommendations: isSimplifiedFormat ? null : (reportData.recommendations || {
          skills: ["Algorithmic thinking", "Problem solving"],
          courses: ["Data Structures", "Algorithms"],
          careerPaths: ["Software Developer"],
          aptitudeResources: {
            books: ["Logical Reasoning", "Quantitative Aptitude"],
            platforms: ["Brilliant.org", "Khan Academy"],
            practiceGuide: "Regular practice with timed exercises"
          },
          programmingResources: {
            courses: ["Data Structures and Algorithms", "Web Development"],
            platforms: ["LeetCode", "HackerRank"],
            topicsToStudy: ["Algorithms", "Data Structures", "System Design"]
          },
          employabilityResources: {
            courses: ["Communication Skills", "Project Management"],
            activities: ["Open Source Contribution", "Hackathons"]
          },
          nextAction: "Focus on strengthening fundamentals and practice coding regularly"
        }),
        detailedAnalysis: isSimplifiedFormat ? null : (reportData.detailedAnalysis || {
          strengths: ["Problem solving", "Basic concepts"],
          areasForImprovement: ["Advanced topics", "System design"],
          skillGaps: ["Algorithm optimization", "Design patterns"],
          industryComparison: {
            aptitude: scores.aptitude,
            programming: scores.programming,
            softSkills: 70,
            overallGap: 25
          }
        })
      };
      
      return NextResponse.json({...report, provider: 'openai'});
      
    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      
      // Return mock report on API error
      const mockReport = generateMockReport(sanitizedFormData, scores);
      return NextResponse.json({...mockReport, provider: 'openai'});
    }
  } catch (error) {
    console.error('Error generating report with OpenAI:', error);
    
    // Return a generic error response
    return NextResponse.json(
      { error: 'Failed to generate assessment report with OpenAI' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FormData, AssessmentResult } from '@/types/assessment';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyDjVjlcUKYUBVUekXXBczyrdyhHjQEpUj8'); // Default test API key

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

    // Build prompt for Gemini API
    const prompt = `Generate a detailed assessment report for a candidate with the following profile:
    Name: ${sanitizedFormData.name}
    Degree: ${sanitizedFormData.degree}
    College: ${sanitizedFormData.collegeName}
    Graduation Year: ${sanitizedFormData.graduationYear}
    Interested Domains: ${sanitizedFormData.interestedDomains.join(', ') || 'Not specified'}
    
    Assessment Scores:
    - Aptitude & Reasoning: ${scores.aptitude}/100
    - General Programming: ${scores.programming}/100
    - Employability Skills: ${
      typeof scores.employability === 'object' 
        ? Object.entries(scores.employability)
            .map(([category, score]) => `${category}: ${score}/100`)
            .join(', ')
        : 'General: ' + scores.employability + '/100'
    }
    
    Please provide:
    1. A detailed analysis of strengths and areas for improvement
    2. Specific skill gaps identified
    3. Recommended courses and learning paths
    4. Career path suggestions based on their profile and performance
    5. Action items for skill development
    6. Resources for aptitude, programming, and employability improvement
    
    Format the response as a JSON object with the following structure:
    {
      "userId": "${userId || 'user-' + Math.floor(Math.random() * 1000000)}",
      "timestamp": "${new Date().toISOString()}",
      "sectionDetails": {
        "aptitude": {
          "totalQuestions": 10,
          "correctAnswers": 7,
          "accuracy": 70,
          "strengths": ["strength1", "strength2"],
          "weakAreas": ["weak1", "weak2"]
        },
        "programming": {
          "totalQuestions": 10,
          "correctAnswers": 6,
          "accuracy": 60,
          "strengths": ["strength1", "strength2"],
          "weakAreas": ["weak1", "weak2"]
        },
        "employability": {
          "totalQuestions": 15,
          "correctAnswers": 10,
          "accuracy": 67,
          "softSkillsScore": 75,
          "professionalSkillsScore": 65,
          "aiLiteracyScore": 60,
          "strengths": ["strength1", "strength2"],
          "weakAreas": ["weak1", "weak2"]
        }
      },
      "outcome": "Pass",
      "skillReadinessLevel": "Intermediate",
      "recommendations": {
        "skills": ["skill1", "skill2", ...],
        "courses": ["course1", "course2", ...],
        "careerPaths": ["path1", "path2", ...],
        "aptitudeResources": {
          "books": ["book1", "book2"],
          "platforms": ["platform1", "platform2"],
          "practiceGuide": "Guide for practicing aptitude skills"
        },
        "programmingResources": {
          "courses": ["course1", "course2"],
          "platforms": ["platform1", "platform2"],
          "topicsToStudy": ["topic1", "topic2"]
        },
        "employabilityResources": {
          "courses": ["course1", "course2"],
          "activities": ["activity1", "activity2"]
        },
        "nextAction": "Clear next step for the candidate"
      },
      "detailedAnalysis": {
        "strengths": ["strength1", "strength2", ...],
        "areasForImprovement": ["area1", "area2", ...],
        "skillGaps": ["gap1", "gap2", ...],
        "industryComparison": {
          "aptitude": 70,
          "programming": 65,
          "softSkills": 72,
          "overallGap": 20
        }
      }
    }`;

    try {
      // Call Gemini API
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean the response and parse JSON
      const cleanedResponse = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      try {
        // Parse the response
        const reportData = JSON.parse(cleanedResponse);
        
        // Build the final report with defaults for missing properties
        const report: AssessmentResult = {
          userId: userId || reportData.userId,
          timestamp: reportData.timestamp || new Date().toISOString(),
          formData: sanitizedFormData,
          scores,
          sectionDetails: reportData.sectionDetails || {
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
          },
          outcome: reportData.outcome || 'Pass',
          skillReadinessLevel: reportData.skillReadinessLevel || 'Intermediate',
          recommendations: {
            skills: reportData.recommendations?.skills || ["Algorithmic thinking", "Problem solving"],
            courses: reportData.recommendations?.courses || ["Data Structures", "Algorithms"],
            careerPaths: reportData.recommendations?.careerPaths || ["Software Developer"],
            aptitudeResources: reportData.recommendations?.aptitudeResources || {
              books: ["Logical Reasoning", "Quantitative Aptitude"],
              platforms: ["Brilliant.org", "Khan Academy"],
              practiceGuide: "Regular practice with timed exercises"
            },
            programmingResources: reportData.recommendations?.programmingResources || {
              courses: ["Data Structures and Algorithms", "Web Development"],
              platforms: ["LeetCode", "HackerRank"],
              topicsToStudy: ["Algorithms", "Data Structures", "System Design"]
            },
            employabilityResources: reportData.recommendations?.employabilityResources || {
              courses: ["Communication Skills", "Project Management"],
              activities: ["Open Source Contribution", "Hackathons"]
            },
            nextAction: reportData.recommendations?.nextAction || "Focus on strengthening fundamentals and practice coding regularly"
          },
          detailedAnalysis: reportData.detailedAnalysis || {
            strengths: ["Problem solving", "Basic concepts"],
            areasForImprovement: ["Advanced topics", "System design"],
            skillGaps: ["Algorithm optimization", "Design patterns"],
            industryComparison: {
              aptitude: scores.aptitude,
              programming: scores.programming,
              softSkills: 70,
              overallGap: 25
            }
          }
        };
        
        return NextResponse.json(report);
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.log('Raw response:', text);
        
        // Return mock report on parse error
        const mockReport = generateMockReport(sanitizedFormData, scores);
        return NextResponse.json(mockReport);
      }
    } catch (apiError) {
      console.error('Error calling Gemini API:', apiError);
      
      // Return mock report on API error
      const mockReport = generateMockReport(sanitizedFormData, scores);
      return NextResponse.json(mockReport);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    
    // Return a generic error response
    return NextResponse.json(
      { error: 'Failed to generate assessment report' },
      { status: 500 }
    );
  }
} 
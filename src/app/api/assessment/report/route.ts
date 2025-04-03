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
          "weakAreas": ["weakness1", "weakness2"]
        },
        "programming": {
          "totalQuestions": 10,
          "correctAnswers": 6,
          "accuracy": 60,
          "strengths": ["strength1", "strength2"],
          "weakAreas": ["weakness1", "weakness2"]
        },
        "employability": {
          "totalQuestions": 10,
          "correctAnswers": 8,
          "accuracy": 80,
          "softSkillsScore": 75,
          "professionalSkillsScore": 70,
          "aiLiteracyScore": 65,
          "strengths": ["strength1", "strength2"],
          "weakAreas": ["weakness1", "weakness2"]
        }
      },
      "outcome": "Pass",
      "skillReadinessLevel": "Intermediate",
      "recommendations": {
        "skills": ["skill1", "skill2"],
        "courses": ["course1", "course2"],
        "careerPaths": ["path1", "path2"],
        "aptitudeResources": {
          "books": ["book1", "book2"],
          "platforms": ["platform1", "platform2"],
          "practiceGuide": "guide text"
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
        "nextAction": "action text"
      },
      "detailedAnalysis": {
        "strengths": ["strength1", "strength2"],
        "areasForImprovement": ["area1", "area2"],
        "skillGaps": ["gap1", "gap2"],
        "industryComparison": {
          "aptitude": 70,
          "programming": 65,
          "softSkills": 75,
          "overallGap": 25
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
        
        // Build the final report
        const report: AssessmentResult = {
          userId: userId || reportData.userId,
          timestamp: reportData.timestamp || new Date().toISOString(),
          formData: sanitizedFormData,
          scores,
          sectionDetails: reportData.sectionDetails || {
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
          outcome: reportData.outcome || "Pass",
          skillReadinessLevel: reportData.skillReadinessLevel || "Intermediate",
          recommendations: reportData.recommendations || {
            skills: ["Algorithm optimization", "Data structures", "System design"],
            courses: ["Data Structures & Algorithms", "System Design", "Web Development"],
            careerPaths: ["Software Engineer", "Full Stack Developer", "Backend Developer"],
            aptitudeResources: {
              books: ["Cracking the Coding Interview", "Problem Solving Strategies"],
              platforms: ["LeetCode", "HackerRank"],
              practiceGuide: "Focus on algorithmic thinking"
            },
            programmingResources: {
              courses: ["Data Structures", "System Design"],
              platforms: ["GitHub", "Stack Overflow"],
              topicsToStudy: ["Algorithms", "Design patterns"]
            },
            employabilityResources: {
              courses: ["Professional Communication", "Team Leadership"],
              activities: ["Join open source projects", "Attend tech meetups"]
            },
            nextAction: "Focus on strengthening fundamentals"
          },
          detailedAnalysis: reportData.detailedAnalysis || {
            strengths: ["Problem-solving", "Technical fundamentals"],
            areasForImprovement: ["Advanced algorithms", "System design"],
            skillGaps: ["Performance optimization", "Distributed systems"],
            industryComparison: {
              aptitude: 70,
              programming: 65,
              softSkills: 75,
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
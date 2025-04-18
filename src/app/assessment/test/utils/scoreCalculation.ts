import { 
  AssessmentScores, 
  DetailedAnalysis, 
  EmployabilityScores,
  Question,
  Section,
  SectionAnalysis
} from "@/types/assessment";
import { errorHandler } from "./errorHandling";

/**
 * ScoreCalculator class handles all scoring and analysis for the assessment
 */
export class ScoreCalculator {
  /**
   * Calculate scores for all sections based on user answers
   */
  calculateScores(
    sections: Section[], 
    userAnswers: Record<string, string>
  ): AssessmentScores {
    try {
      const scores: Partial<AssessmentScores> = {
        employability: {} as EmployabilityScores
      };
      
      // Process each section
      sections.forEach(section => {
        if (section.type === 'employability') {
          // Process employability categories separately
          const employabilityScores = this.calculateEmployabilityScores(section, userAnswers);
          scores.employability = employabilityScores;
        } else {
          // Calculate score for aptitude and programming
          const sectionScore = this.calculateSectionScore(section, userAnswers);
          scores[section.type] = sectionScore;
        }
      });
      
      // Ensure all scores are set, default to 0 if missing
      const finalScores: AssessmentScores = {
        aptitude: scores.aptitude || 0,
        programming: scores.programming || 0,
        employability: scores.employability || {
          core: 0,
          soft: 0,
          professional: 0,
          communication: 0,
          teamwork: 0,
          leadership: 0,
          problem_solving: 0,
          domain: 0
        },
        total: 0,
        percentile: 0,
        readinessScore: 0
      };
      
      // Calculate total score
      finalScores.total = this.calculateTotalScore(finalScores);
      
      // Calculate percentile and readiness score
      finalScores.percentile = Math.round(finalScores.total * 0.9); // Simplified percentile calculation
      finalScores.readinessScore = Math.round(finalScores.total * 0.95); // Simplified readiness score
      
      return finalScores;
    } catch (error) {
      errorHandler.logError(
        errorHandler.createError(
          `Failed to calculate scores: ${error instanceof Error ? error.message : String(error)}`,
          'score-calculation',
          { sections: sections.map(s => s.id) }
        )
      );
      
      // Return default scores on error
      return this.getDefaultScores();
    }
  }
  
  /**
   * Calculate detailed analysis of user performance
   */
  generateDetailedAnalysis(
    sections: Section[],
    userAnswers: Record<string, string>
  ): DetailedAnalysis {
    try {
      const analysis: DetailedAnalysis = {
        sections: {},
        performance: {
          strengths: [],
          weaknesses: [],
          timeEfficiency: {},
          answeredByDifficulty: { easy: 0, medium: 0, hard: 0 },
          correctByDifficulty: { easy: 0, medium: 0, hard: 0 },
          totalByDifficulty: { easy: 0, medium: 0, hard: 0 }
        },
        recommendations: []
      };
      
      // Analyze each section
      sections.forEach(section => {
        const sectionAnalysis = this.analyzeSectionPerformance(section, userAnswers);
        analysis.sections[section.id] = sectionAnalysis;
        
        // Update difficulty stats
        section.questions.forEach(question => {
          const difficulty = question.difficulty || 'medium';
          const isAnswered = !!userAnswers[question.id];
          const isCorrect = userAnswers[question.id] === question.correctAnswer;
          
          analysis.performance.totalByDifficulty[difficulty]++;
          
          if (isAnswered) {
            analysis.performance.answeredByDifficulty[difficulty]++;
            if (isCorrect) {
              analysis.performance.correctByDifficulty[difficulty]++;
            }
          }
        });
      });
      
      // Identify strengths and weaknesses
      const categories = this.aggregateCategories(analysis.sections);
      const categoryScores = this.calculateCategoryScores(categories);
      
      // Find top strengths and weaknesses (categories with enough questions)
      const significantCategories = categoryScores.filter(c => c.questions >= 3);
      
      // Sort by score (descending)
      significantCategories.sort((a, b) => b.score - a.score);
      
      // Get top 3 strengths
      analysis.performance.strengths = significantCategories
        .slice(0, 3)
        .map(c => ({ category: c.category, score: c.score }));
      
      // Get bottom 3 weaknesses
      analysis.performance.weaknesses = significantCategories
        .slice(-3)
        .reverse()
        .map(c => ({ category: c.category, score: c.score }));
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);
      
      return analysis;
    } catch (error) {
      errorHandler.logError(
        errorHandler.createError(
          `Failed to generate detailed analysis: ${error instanceof Error ? error.message : String(error)}`,
          'analysis-generation',
          { sections: sections.map(s => s.id) }
        )
      );
      
      // Return basic analysis on error
      return this.getDefaultAnalysis();
    }
  }
  
  /**
   * Calculate score for a single section
   */
  private calculateSectionScore(
    section: Section, 
    userAnswers: Record<string, string>
  ): number {
    const answeredQuestions = section.questions.filter(q => !!userAnswers[q.id]);
    if (answeredQuestions.length === 0) return 0;
    
    const correctAnswers = section.questions.filter(
      q => userAnswers[q.id] === q.correctAnswer
    ).length;
    
    return Math.round((correctAnswers / section.questions.length) * 100);
  }
  
  /**
   * Calculate scores for employability section with multiple categories
   */
  private calculateEmployabilityScores(
    section: Section, 
    userAnswers: Record<string, string>
  ): EmployabilityScores {
    const result: Partial<EmployabilityScores> = {};
    
    // Initialize category counts and scores
    const categoryCounts: Record<string, number> = {};
    const categoryScores: Record<string, number> = {};
    
    // Count questions and correct answers by category
    section.questions.forEach(question => {
      const categoryId = question.category || 'general';
      
      // Initialize if not exists
      if (!categoryCounts[categoryId]) {
        categoryCounts[categoryId] = 0;
        categoryScores[categoryId] = 0;
      }
      
      categoryCounts[categoryId]++;
      
      // Count correct answers
      const userAnswer = userAnswers[question.id];
      if (userAnswer === question.correctAnswer) {
        categoryScores[categoryId]++;
      }
    });
    
    // Calculate percentage score for each category
    if (section.categories) {
      section.categories.forEach(category => {
        if (categoryCounts[category.id] > 0) {
          const score = (categoryScores[category.id] / categoryCounts[category.id]) * 100;
          result[category.id] = Math.round(score);
        } else {
          result[category.id] = 0;
        }
      });
    }
    
    // Ensure all employability categories have values
    const scores: EmployabilityScores = {
      core: result.core || 0,
      soft: result.soft || 0,
      professional: result.professional || 0,
      communication: result.communication || 0,
      teamwork: result.teamwork || 0,
      leadership: result.leadership || 0,
      problem_solving: result.problem_solving || 0,
      domain: result.domain || 0
    };
    
    return scores;
  }
  
  /**
   * Calculate the total score across all sections
   */
  private calculateTotalScore(scores: AssessmentScores): number {
    // Calculate average employability score
    const employabilityValues = Object.values(scores.employability);
    const avgEmployability = employabilityValues.reduce((sum, val) => sum + val, 0) / 
                            employabilityValues.length;
    
    // Calculate weighted average of all scores
    const totalScore = Math.round(
      (scores.aptitude + scores.programming + avgEmployability) / 3
    );
    
    return totalScore;
  }
  
  /**
   * Analyze a section's performance in detail
   */
  private analyzeSectionPerformance(
    section: Section, 
    userAnswers: Record<string, string>
  ): SectionAnalysis {
    const analysis: SectionAnalysis = {
      score: 0,
      answeredCount: 0,
      correctCount: 0,
      categories: {},
      questionBreakdown: []
    };
    
    // Process each question
    section.questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      const isAnswered = !!userAnswer;
      const isCorrect = userAnswer === question.correctAnswer;
      const category = question.category || 'general';
      
      // Update overall question counts
      if (isAnswered) {
        analysis.answeredCount++;
        if (isCorrect) {
          analysis.correctCount++;
        }
      }
      
      // Update category breakdown
      if (!analysis.categories[category]) {
        analysis.categories[category] = {
          totalQuestions: 0,
          answeredQuestions: 0,
          correctAnswers: 0
        };
      }
      
      analysis.categories[category].totalQuestions++;
      
      if (isAnswered) {
        analysis.categories[category].answeredQuestions++;
        if (isCorrect) {
          analysis.categories[category].correctAnswers++;
        }
      }
      
      // Add question details
      analysis.questionBreakdown.push({
        questionId: question.id,
        difficulty: question.difficulty || 'medium',
        category,
        isAnswered,
        isCorrect,
        timeTaken: 0 // To be implemented with time tracking
      });
    });
    
    // Calculate section score
    if (analysis.answeredCount > 0) {
      analysis.score = (analysis.correctCount / section.questions.length) * 100;
    }
    
    return analysis;
  }
  
  /**
   * Aggregate all categories across sections
   */
  private aggregateCategories(sections: Record<string, SectionAnalysis>): Record<string, {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
  }> {
    const categories: Record<string, {
      totalQuestions: number;
      answeredQuestions: number;
      correctAnswers: number;
    }> = {};
    
    // Combine categories from all sections
    Object.values(sections).forEach(section => {
      Object.entries(section.categories).forEach(([category, data]) => {
        if (!categories[category]) {
          categories[category] = { ...data };
        } else {
          categories[category].totalQuestions += data.totalQuestions;
          categories[category].answeredQuestions += data.answeredQuestions;
          categories[category].correctAnswers += data.correctAnswers;
        }
      });
    });
    
    return categories;
  }
  
  /**
   * Calculate scores for each category
   */
  private calculateCategoryScores(categories: Record<string, {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
  }>): Array<{
    category: string;
    score: number;
    questions: number;
  }> {
    return Object.entries(categories).map(([category, data]) => {
      const score = data.answeredQuestions > 0 
        ? (data.correctAnswers / data.answeredQuestions) * 100 
        : 0;
      return { 
        category, 
        score: Math.round(score), 
        questions: data.totalQuestions 
      };
    });
  }
  
  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(analysis: DetailedAnalysis): Array<{
    type: string;
    category?: string;
    message: string;
    resources?: Array<{ name: string; url: string }>;
  }> {
    const recommendations = [];
    
    // Check performance by difficulty
    if (analysis.performance.correctByDifficulty.easy < analysis.performance.totalByDifficulty.easy * 0.6) {
      recommendations.push({
        type: 'fundamental',
        message: "Focus on strengthening your fundamental skills. Review core concepts and practice basic problems."
      });
    }
    
    // Generate category-based recommendations
    analysis.performance.weaknesses.forEach(weak => {
      recommendations.push({
        type: 'category',
        category: weak.category,
        message: `Work on improving your ${weak.category.replace('_', ' ')} skills where you scored ${Math.round(weak.score)}%.`,
        resources: this.getResourcesForCategory(weak.category)
      });
    });
    
    return recommendations;
  }
  
  /**
   * Get learning resources for a specific category
   */
  private getResourcesForCategory(category: string): Array<{ name: string; url: string }> {
    // Resource mapping
    const resourceMap: Record<string, Array<{ name: string; url: string }>> = {
      numerical: [
        { name: "Khan Academy - Math Skills", url: "https://www.khanacademy.org/math" },
        { name: "Brilliant.org - Quantitative Finance", url: "https://brilliant.org/courses/quantitative-finance/" }
      ],
      problem_solving: [
        { name: "LeetCode Problem Solving", url: "https://leetcode.com/problemset/algorithms/" },
        { name: "HackerRank Problem Solving", url: "https://www.hackerrank.com/domains/algorithms" }
      ],
      // Add mappings for other categories
    };
    
    return resourceMap[category] || [];
  }
  
  /**
   * Get default scores when calculation fails
   */
  private getDefaultScores(): AssessmentScores {
    return {
      aptitude: 0,
      programming: 0,
      employability: {
        core: 0,
        soft: 0,
        professional: 0,
        communication: 0,
        teamwork: 0,
        leadership: 0,
        problem_solving: 0,
        domain: 0
      },
      total: 0,
      percentile: 0,
      readinessScore: 0
    };
  }
  
  /**
   * Get default analysis when generation fails
   */
  private getDefaultAnalysis(): DetailedAnalysis {
    return {
      sections: {},
      performance: {
        strengths: [],
        weaknesses: [],
        timeEfficiency: {},
        answeredByDifficulty: { easy: 0, medium: 0, hard: 0 },
        correctByDifficulty: { easy: 0, medium: 0, hard: 0 },
        totalByDifficulty: { easy: 0, medium: 0, hard: 0 }
      },
      recommendations: []
    };
  }
}

// Export singleton instance
export const scoreCalculator = new ScoreCalculator(); 
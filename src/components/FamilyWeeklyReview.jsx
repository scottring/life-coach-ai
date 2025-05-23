import React, { useState, useEffect } from 'react';
import { useFamily } from '../providers/FamilyProvider';
import FamilyFinances from './FamilyFinances';

function FamilyWeeklyReview({ familyId }) {
  const {
    familyGoals,
    familyTasks,
    familyMeals,
    familyMembers,
    loading,
    error
  } = useFamily();

  const [reviewPhase, setReviewPhase] = useState('intro'); // 'intro', 'previous-week', 'progress-review', 'finances', 'meals-nutrition', 'next-week', 'commitments', 'summary'
  const [reviewData, setReviewData] = useState({
    weekEnding: new Date(),
    accomplishments: [],
    challenges: [],
    goalProgress: {},
    nextWeekFocus: [],
    familyFeedback: {},
    commitments: {},
    financialData: null,
    mealFeedback: {
      nutritionGoals: {},
      mealRatings: {},
      kidFavorites: [],
      adultFavorites: [],
      dislikedMeals: [],
      nutritionNotes: '',
      exerciseProgress: '',
      healthGoalProgress: {}
    }
  });
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [aiInsights, setAiInsights] = useState([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    if (familyId) {
      initializeReview();
    }
  }, [familyId, familyGoals, familyTasks]);

  const initializeReview = () => {
    // Calculate the week ending date (most recent Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekEnding = new Date(now);
    weekEnding.setDate(now.getDate() - dayOfWeek + 7); // Next Sunday
    
    setReviewData(prev => ({
      ...prev,
      weekEnding,
      goalProgress: familyGoals.reduce((acc, goal) => {
        acc[goal.id] = {
          id: goal.id,
          title: goal.title,
          previousProgress: goal.current_value || 0,
          currentProgress: goal.current_value || 0,
          feedback: '',
          blockers: [],
          nextWeekActions: []
        };
        return acc;
      }, {})
    }));
  };

  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      // Analyze family data for insights
      const completedTasksThisWeek = familyTasks.filter(task => {
        const completedDate = new Date(task.updated_at);
        const weekStart = new Date(reviewData.weekEnding);
        weekStart.setDate(weekStart.getDate() - 7);
        return task.status === 'completed' && completedDate >= weekStart && completedDate <= reviewData.weekEnding;
      });

      const overdueTasks = familyTasks.filter(task => {
        return task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
      });

      const insights = [
        {
          type: 'accomplishment',
          title: 'Weekly Productivity',
          message: `Your family completed ${completedTasksThisWeek.length} tasks this week! ${completedTasksThisWeek.length > 5 ? 'Excellent teamwork!' : 'Keep building momentum.'}`
        },
        {
          type: 'challenge',
          title: 'Overdue Items',
          message: overdueTasks.length > 0 ? 
            `You have ${overdueTasks.length} overdue tasks. Consider reprioritizing or breaking them into smaller steps.` :
            'Great job staying on top of deadlines!'
        },
        {
          type: 'suggestion',
          title: 'Goal Focus',
          message: familyGoals.length === 0 ? 
            'Consider setting 1-2 family goals to give your activities more direction.' :
            `You have ${familyGoals.length} active goals. Focus on making progress on your top priority this week.`
        }
      ];

      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const updateGoalProgress = (goalId, field, value) => {
    setReviewData(prev => ({
      ...prev,
      goalProgress: {
        ...prev.goalProgress,
        [goalId]: {
          ...prev.goalProgress[goalId],
          [field]: value
        }
      }
    }));
  };

  const addNextWeekFocus = (item) => {
    setReviewData(prev => ({
      ...prev,
      nextWeekFocus: [...prev.nextWeekFocus, item]
    }));
  };

  const getCurrentMember = () => {
    return familyMembers[currentMemberIndex] || null;
  };

  const getWeekDateRange = () => {
    const end = new Date(reviewData.weekEnding);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return {
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString()
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Weekly Family Review</h2>
          <div className="text-sm text-gray-500">
            Week of {getWeekDateRange().start} - {getWeekDateRange().end}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {['intro', 'previous-week', 'progress-review', 'finances', 'meals-nutrition', 'next-week', 'commitments', 'summary'].map((phase, index) => (
            <div key={phase} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                reviewPhase === phase ? 'bg-blue-600 text-white' :
                ['intro', 'previous-week', 'progress-review', 'finances', 'meals-nutrition', 'next-week', 'commitments', 'summary'].indexOf(reviewPhase) > index ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              {index < 7 && (
                <div className={`w-8 h-1 ${
                  ['intro', 'previous-week', 'progress-review', 'finances', 'meals-nutrition', 'next-week', 'commitments', 'summary'].indexOf(reviewPhase) > index ? 'bg-green-500' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Intro Phase */}
      {reviewPhase === 'intro' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Weekly Family Review</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Take 15-20 minutes together as a family to reflect on this week's progress, 
              celebrate accomplishments, and plan for the week ahead. This review will help 
              you stay aligned on your family goals and priorities.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🔍</div>
                <h4 className="font-medium text-blue-900">Review Progress</h4>
                <p className="text-blue-700 text-sm">Look back at what you accomplished</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🎯</div>
                <h4 className="font-medium text-green-900">Set Priorities</h4>
                <p className="text-green-700 text-sm">Choose focus areas for next week</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl mb-2">🤝</div>
                <h4 className="font-medium text-purple-900">Make Commitments</h4>
                <p className="text-purple-700 text-sm">Each person commits to specific actions</p>
              </div>
            </div>

            <button
              onClick={() => {
                setReviewPhase('previous-week');
                generateAIInsights();
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Review Session
            </button>
          </div>
        </div>
      )}

      {/* Previous Week Review */}
      {reviewPhase === 'previous-week' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Looking Back: What Did We Accomplish?</h3>
          
          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">🤖 AI Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiInsights.map((insight, index) => (
                  <div key={index} className={`rounded-lg p-4 ${
                    insight.type === 'accomplishment' ? 'bg-green-50 border-green-200' :
                    insight.type === 'challenge' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  } border`}>
                    <h5 className={`font-medium mb-2 ${
                      insight.type === 'accomplishment' ? 'text-green-900' :
                      insight.type === 'challenge' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                      {insight.title}
                    </h5>
                    <p className={`text-sm ${
                      insight.type === 'accomplishment' ? 'text-green-700' :
                      insight.type === 'challenge' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accomplishments Input */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">🎉 Family Accomplishments</h4>
            <p className="text-gray-600 text-sm mb-3">What are you proud of this week? (Goals achieved, tasks completed, positive moments)</p>
            <textarea
              value={reviewData.accomplishments.join('\n')}
              onChange={(e) => setReviewData(prev => ({...prev, accomplishments: e.target.value.split('\n').filter(Boolean)}))}
              rows={4}
              placeholder="• Completed the living room organization project&#10;• Had family game night 3 times&#10;• Everyone helped with meal prep"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Challenges Input */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">🤔 Challenges & Learning</h4>
            <p className="text-gray-600 text-sm mb-3">What was difficult? What could we improve?</p>
            <textarea
              value={reviewData.challenges.join('\n')}
              onChange={(e) => setReviewData(prev => ({...prev, challenges: e.target.value.split('\n').filter(Boolean)}))}
              rows={3}
              placeholder="• Ran out of time for meal planning&#10;• Kids struggled with homework deadlines&#10;• Need better communication about schedules"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setReviewPhase('progress-review')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Continue to Goal Progress →
            </button>
          </div>
        </div>
      )}

      {/* Goal Progress Review */}
      {reviewPhase === 'progress-review' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Goal Progress Review</h3>
          
          {familyGoals.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎯</div>
              <p className="text-gray-600 mb-4">No family goals set yet.</p>
              <p className="text-sm text-gray-500">Consider setting some goals after this review to give your family activities more direction.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {familyGoals.map((goal) => {
                const progressData = reviewData.goalProgress[goal.id] || {};
                return (
                  <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{goal.title}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Progress This Week</label>
                        <select
                          value={progressData.currentProgress || 0}
                          onChange={(e) => updateGoalProgress(goal.id, 'currentProgress', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value={0}>No progress</option>
                          <option value={25}>Some progress (25%)</option>
                          <option value={50}>Good progress (50%)</option>
                          <option value={75}>Great progress (75%)</option>
                          <option value={100}>Goal completed!</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Overall Feeling</label>
                        <select
                          value={progressData.feedback || ''}
                          onChange={(e) => updateGoalProgress(goal.id, 'feedback', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select...</option>
                          <option value="on-track">On track</option>
                          <option value="ahead">Ahead of schedule</option>
                          <option value="behind">Behind schedule</option>
                          <option value="stuck">Stuck/blocked</option>
                        </select>
                      </div>
                    </div>

                    {progressData.feedback === 'stuck' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">What's blocking progress?</label>
                        <textarea
                          value={progressData.blockers?.join('\n') || ''}
                          onChange={(e) => updateGoalProgress(goal.id, 'blockers', e.target.value.split('\n').filter(Boolean))}
                          rows={2}
                          placeholder="• Need to find a contractor&#10;• Waiting for budget approval"
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Next week's focus for this goal</label>
                      <textarea
                        value={progressData.nextWeekActions?.join('\n') || ''}
                        onChange={(e) => updateGoalProgress(goal.id, 'nextWeekActions', e.target.value.split('\n').filter(Boolean))}
                        rows={2}
                        placeholder="• Get quotes from 3 contractors&#10;• Start decluttering bedroom"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setReviewPhase('previous-week')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => setReviewPhase('finances')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Review Finances →
            </button>
          </div>
        </div>
      )}

      {/* Financial Review */}
      {reviewPhase === 'finances' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">💰 Weekly Financial Check-In</h3>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Review your family's cash flow for this week. Make sure you have enough in checking to cover 
              all upcoming expenses, and track trends over time.
            </p>
            
            <FamilyFinances 
              familyId={familyId} 
              embedded={true}
              onDataChange={(data) => {
                setReviewData(prev => ({...prev, financialData: data}));
              }}
            />
          </div>

          {/* Financial Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-3">💡 Financial Planning Questions</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div>• Are there any large expenses coming up next week that need to be planned for?</div>
              <div>• How does this week's cash flow compare to recent weeks?</div>
              <div>• Are there any spending patterns that could be optimized?</div>
              <div>• Do any family goals require budget adjustments?</div>
            </div>
          </div>

          {/* Financial Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Financial Notes & Observations</label>
            <textarea
              value={reviewData.financialNotes || ''}
              onChange={(e) => setReviewData(prev => ({...prev, financialNotes: e.target.value}))}
              rows={3}
              placeholder="• Need to budget for car repairs next month&#10;• Credit card spending was higher due to holiday shopping&#10;• Good progress on emergency fund goal"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setReviewPhase('progress-review')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back to Goals
            </button>
            <button
              onClick={() => setReviewPhase('meals-nutrition')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Review Meals & Nutrition →
            </button>
          </div>
        </div>
      )}

      {/* Meals & Nutrition Review */}
      {reviewPhase === 'meals-nutrition' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🍽️ Meals & Nutrition Review</h3>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Reflect on this week's meals and nutrition. Consider what worked well for your family and what could be improved.
            </p>
          </div>

          {/* Nutrition Goals Progress */}
          <div className="mb-8">
            <h4 className="font-medium text-gray-900 mb-4">🎯 Health & Nutrition Goals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Exercise Progress */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">Exercise & Activity</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How did exercise go this week?</label>
                    <select
                      value={reviewData.mealFeedback.exerciseProgress}
                      onChange={(e) => setReviewData(prev => ({
                        ...prev,
                        mealFeedback: {
                          ...prev.mealFeedback,
                          exerciseProgress: e.target.value
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="exceeded">Exceeded goals</option>
                      <option value="met">Met goals</option>
                      <option value="partially">Partially met goals</option>
                      <option value="missed">Missed goals</option>
                      <option value="no-goals">No exercise goals set</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nutrition Goals */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">Nutrition & Eating</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Family nutrition goals progress</label>
                    <select
                      value={reviewData.mealFeedback.nutritionGoals.overall || ''}
                      onChange={(e) => setReviewData(prev => ({
                        ...prev,
                        mealFeedback: {
                          ...prev.mealFeedback,
                          nutritionGoals: {
                            ...prev.mealFeedback.nutritionGoals,
                            overall: e.target.value
                          }
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="excellent">Excellent - ate well all week</option>
                      <option value="good">Good - mostly healthy choices</option>
                      <option value="mixed">Mixed - some good, some not</option>
                      <option value="poor">Poor - struggled with healthy eating</option>
                      <option value="no-goals">No nutrition goals set</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Goal Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Health & Nutrition Notes</label>
              <textarea
                value={reviewData.mealFeedback.nutritionNotes}
                onChange={(e) => setReviewData(prev => ({
                  ...prev,
                  mealFeedback: {
                    ...prev.mealFeedback,
                    nutritionNotes: e.target.value
                  }
                }))}
                rows={3}
                placeholder="• Started drinking more water&#10;• Kids ate more vegetables this week&#10;• Need to plan healthier snacks"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Meal Feedback for Learning */}
          <div className="mb-8">
            <h4 className="font-medium text-gray-900 mb-4">🍽️ Meal Feedback & Learning</h4>
            <p className="text-gray-600 text-sm mb-4">
              Help the AI learn your family's preferences by reflecting on what meals worked well and what didn't.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kid Favorites */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">👶 Kids' Favorites This Week</h5>
                <textarea
                  value={reviewData.mealFeedback.kidFavorites.join('\n')}
                  onChange={(e) => setReviewData(prev => ({
                    ...prev,
                    mealFeedback: {
                      ...prev.mealFeedback,
                      kidFavorites: e.target.value.split('\n').filter(Boolean)
                    }
                  }))}
                  rows={4}
                  placeholder="• Turkey and cheese sandwiches&#10;• Pasta with marinara sauce&#10;• Apple slices with peanut butter&#10;• Homemade pizza"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Adult Favorites */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">👨‍👩‍👧‍👦 Adult Favorites This Week</h5>
                <textarea
                  value={reviewData.mealFeedback.adultFavorites.join('\n')}
                  onChange={(e) => setReviewData(prev => ({
                    ...prev,
                    mealFeedback: {
                      ...prev.mealFeedback,
                      adultFavorites: e.target.value.split('\n').filter(Boolean)
                    }
                  }))}
                  rows={4}
                  placeholder="• Grilled salmon with vegetables&#10;• Thai curry with rice&#10;• Caesar salad with grilled chicken&#10;• Homemade soup"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Meals That Didn't Work */}
            <div className="mt-4">
              <h5 className="font-medium text-gray-800 mb-3">❌ Meals That Didn't Work</h5>
              <textarea
                value={reviewData.mealFeedback.dislikedMeals.join('\n')}
                onChange={(e) => setReviewData(prev => ({
                  ...prev,
                  mealFeedback: {
                    ...prev.mealFeedback,
                    dislikedMeals: e.target.value.split('\n').filter(Boolean)
                  }
                }))}
                rows={3}
                placeholder="• Broccoli casserole (kids refused)&#10;• Spicy chili (too hot for family)&#10;• Quinoa salad (adults didn't like texture)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Meal Planning Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-3">💡 Meal Planning Questions</h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div>• What meal prep strategies worked well this week?</div>
              <div>• Which meals would you like to repeat next week?</div>
              <div>• Are there any new recipes or cuisines the family wants to try?</div>
              <div>• How can we better balance nutrition with family preferences?</div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setReviewPhase('finances')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back to Finances
            </button>
            <button
              onClick={() => setReviewPhase('next-week')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Plan Next Week →
            </button>
          </div>
        </div>
      )}

      {/* Next Week Planning */}
      {reviewPhase === 'next-week' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Planning Next Week</h3>
          
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">🎯 Top 3 Family Priorities</h4>
            <p className="text-gray-600 text-sm mb-3">What are the most important things to focus on next week?</p>
            
            {[0, 1, 2].map((index) => (
              <div key={index} className="mb-3">
                <input
                  type="text"
                  value={reviewData.nextWeekFocus[index] || ''}
                  onChange={(e) => {
                    const newFocus = [...reviewData.nextWeekFocus];
                    newFocus[index] = e.target.value;
                    setReviewData(prev => ({...prev, nextWeekFocus: newFocus}));
                  }}
                  placeholder={`Priority ${index + 1}`}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Carry-over items */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">📋 Items to Carry Over</h4>
            <p className="text-gray-600 text-sm mb-3">Unfinished tasks or goals that need attention next week</p>
            
            {familyTasks.filter(task => task.status !== 'completed').slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center space-x-3 mb-2">
                <input
                  type="checkbox"
                  checked={reviewData.nextWeekFocus.includes(task.title)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      addNextWeekFocus(task.title);
                    } else {
                      setReviewData(prev => ({
                        ...prev,
                        nextWeekFocus: prev.nextWeekFocus.filter(item => item !== task.title)
                      }));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">{task.title}</span>
                {task.priority <= 2 && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High Priority</span>}
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setReviewPhase('meals-nutrition')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back to Meals & Nutrition
            </button>
            <button
              onClick={() => setReviewPhase('commitments')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Make Commitments →
            </button>
          </div>
        </div>
      )}

      {/* Individual Commitments */}
      {reviewPhase === 'commitments' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Individual Commitments</h3>
          
          {familyMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No family members set up yet. You can add commitments for the whole family.</p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <h4 className="font-medium text-gray-900">
                  Member {currentMemberIndex + 1} of {familyMembers.length}
                </h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentMemberIndex(Math.max(0, currentMemberIndex - 1))}
                    disabled={currentMemberIndex === 0}
                    className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentMemberIndex(Math.min(familyMembers.length - 1, currentMemberIndex + 1))}
                    disabled={currentMemberIndex === familyMembers.length - 1}
                    className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {getCurrentMember() && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    {getCurrentMember().role === 'admin' ? 'Admin' : 
                     getCurrentMember().role === 'parent' ? 'Parent' : 
                     `Member ${getCurrentMember().user_id.substring(0, 6)}`}
                  </h5>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What will you commit to doing next week? (1-3 specific actions)
                    </label>
                    <textarea
                      value={reviewData.commitments[getCurrentMember().user_id] || ''}
                      onChange={(e) => setReviewData(prev => ({
                        ...prev,
                        commitments: {
                          ...prev.commitments,
                          [getCurrentMember().user_id]: e.target.value
                        }
                      }))}
                      rows={3}
                      placeholder="• Complete research for new furniture&#10;• Organize my closet by Friday&#10;• Help with meal prep on Sunday"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setReviewPhase('next-week')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={() => setReviewPhase('summary')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Review Summary →
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      {reviewPhase === 'summary' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🎉 Review Complete!</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Accomplishments Summary */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">This Week's Wins</h4>
              <ul className="text-sm text-green-800 space-y-1">
                {reviewData.accomplishments.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>

            {/* Next Week Focus */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Next Week's Priorities</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {reviewData.nextWeekFocus.filter(Boolean).map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Family Commitments */}
          {Object.keys(reviewData.commitments).length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Individual Commitments</h4>
              <div className="space-y-3">
                {Object.entries(reviewData.commitments).map(([userId, commitment]) => {
                  const member = familyMembers.find(m => m.user_id === userId);
                  return (
                    <div key={userId} className="border border-gray-200 rounded-lg p-3">
                      <h5 className="font-medium text-gray-800 text-sm mb-2">
                        {member?.role === 'admin' ? 'Admin' : 
                         member?.role === 'parent' ? 'Parent' : 
                         `Member ${userId.substring(0, 6)}`}
                      </h5>
                      <div className="text-sm text-gray-600">
                        {commitment.split('\n').map((line, index) => (
                          <div key={index}>• {line}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-yellow-900 mb-2">💡 Next Steps</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Save this review for reference during the week</li>
              <li>• Check in mid-week on commitment progress</li>
              <li>• Schedule next week's review session</li>
              <li>• Consider updating family goals based on insights</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setReviewPhase('commitments')}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
            >
              ← Back to Edit
            </button>
            <div className="space-x-3">
              <button
                onClick={() => {
                  // Save review data (in real app, would save to database)
                  localStorage.setItem(`family_review_${familyId}_${reviewData.weekEnding.toISOString()}`, JSON.stringify(reviewData));
                  alert('Review saved! Great job completing your weekly review.');
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700"
              >
                Save Review
              </button>
              <button
                onClick={() => {
                  setReviewPhase('intro');
                  initializeReview();
                }}
                className="border border-blue-300 text-blue-600 px-6 py-2 rounded-md font-medium hover:bg-blue-50"
              >
                Start New Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyWeeklyReview;
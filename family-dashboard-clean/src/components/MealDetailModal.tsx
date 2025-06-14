import React, { useState } from 'react';
import { X, Clock, Users, ChefHat, Star, ShoppingCart, Maximize2, Plus } from 'lucide-react';
import { EnhancedMeal, MealRating } from '../types/recipe';
import Modal from './common/Modal';

interface MealDetailModalProps {
  meal: EnhancedMeal;
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenCookMode: () => void;
  onAddToGroceryList: (ingredients: any[]) => void;
  onRateMeal: (rating: MealRating) => void;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  meal,
  date,
  isOpen,
  onClose,
  onOpenCookMode,
  onAddToGroceryList,
  onRateMeal
}) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [showRatingForm, setShowRatingForm] = useState<boolean>(false);

  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleRatingSubmit = () => {
    if (userRating > 0) {
      onRateMeal({
        mealId: meal.mealId,
        rating: userRating,
        review: review.trim() || undefined,
        dateRated: new Date().toISOString()
      });
      setShowRatingForm(false);
      setUserRating(0);
      setReview('');
    }
  };

  const handleAddAllToGroceryList = () => {
    if (meal.recipe?.ingredients) {
      onAddToGroceryList(meal.recipe.ingredients);
    }
  };

  if (!meal.recipe) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={formatMealType(meal.mealType)}>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">{meal.notes}</h3>
          <p className="text-gray-600">No detailed recipe available for this meal.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={meal.recipe.name}>
      <div className="max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{meal.recipe.name}</h2>
              <p className="text-gray-600 mt-1">{formatMealType(meal.mealType)} • {date}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onOpenCookMode}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                Cook Mode
              </button>
            </div>
          </div>
          
          <p className="text-gray-700 mb-4">{meal.recipe.description}</p>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Prep: {meal.recipe.prepTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Cook: {meal.recipe.cookTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{meal.servings} serving{meal.servings !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <ChefHat className="w-4 h-4" />
              <span>{meal.recipe.difficulty}</span>
            </div>
          </div>
          
          {meal.recipe.tags && (
            <div className="flex flex-wrap gap-2 mt-4">
              {meal.recipe.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ingredients</h3>
              <button
                onClick={handleAddAllToGroceryList}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add All to Grocery List
              </button>
            </div>
            
            <div className="space-y-3">
              {meal.recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{ingredient.item}</span>
                    <span className="text-gray-600 ml-2">{ingredient.quantity}</span>
                  </div>
                  <button
                    onClick={() => onAddToGroceryList([ingredient])}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Instructions</h3>
            <div className="space-y-4">
              {meal.recipe.instructions.map((instruction) => (
                <div key={instruction.step} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {instruction.step}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{instruction.instruction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nutrition */}
        {meal.recipe.nutrition && (
          <div className="p-6 border-t bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Nutrition (per serving)</h3>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{meal.recipe.nutrition.calories}</div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{meal.recipe.nutrition.protein}</div>
                <div className="text-sm text-gray-600">Protein</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{meal.recipe.nutrition.carbs}</div>
                <div className="text-sm text-gray-600">Carbs</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{meal.recipe.nutrition.fat}</div>
                <div className="text-sm text-gray-600">Fat</div>
              </div>
              <div>
                <div className="text-lg font-semibold">{meal.recipe.nutrition.fiber}</div>
                <div className="text-sm text-gray-600">Fiber</div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Section */}
        <div className="p-6 border-t">
          {!showRatingForm ? (
            <button
              onClick={() => setShowRatingForm(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Star className="w-4 h-4" />
              Rate this meal
            </button>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Rate this meal</h3>
              
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className={`w-8 h-8 ${
                      star <= userRating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    <Star className="w-full h-full fill-current" />
                  </button>
                ))}
              </div>
              
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts about this meal (optional)"
                className="w-full p-3 border rounded-lg resize-none"
                rows={3}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={handleRatingSubmit}
                  disabled={userRating === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Rating
                </button>
                <button
                  onClick={() => setShowRatingForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
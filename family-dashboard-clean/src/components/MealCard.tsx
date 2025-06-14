import React from 'react';
import { Clock, Users, ChefHat } from 'lucide-react';
import { EnhancedMeal } from '../types/recipe';

interface MealCardProps {
  meal: EnhancedMeal;
  date: string;
  onClick: () => void;
}

export const MealCard: React.FC<MealCardProps> = ({ meal, date, onClick }) => {
  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleClick = () => {
    console.log('MealCard clicked:', meal, date);
    onClick();
  };

  const getMealTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'breakfast':
        return 'bg-orange-100 border-orange-200 text-orange-800';
      case 'lunch':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'dinner':
        return 'bg-purple-100 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  return (
    <div 
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md hover:scale-105 ${getMealTypeColor(meal.mealType)}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {formatMealType(meal.mealType)}
        </span>
        <ChefHat className="w-4 h-4" />
      </div>
      
      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
        {meal.recipe?.name || meal.notes}
      </h3>
      
      {meal.recipe && (
        <>
          <p className="text-sm mb-3 line-clamp-2 opacity-75">
            {meal.recipe.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{meal.recipe.totalTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{meal.servings}</span>
            </div>
            <div className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
              {meal.recipe.difficulty}
            </div>
          </div>
          
          {meal.recipe.tags && meal.recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {meal.recipe.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs bg-white bg-opacity-70 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
              {meal.recipe.tags.length > 3 && (
                <span className="text-xs opacity-75">+{meal.recipe.tags.length - 3}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
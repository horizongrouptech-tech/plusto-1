import React, { useState } from 'react';

const ratingLabels = {
  1: "לא טוב",
  2: "חלש", 
  3: "בסדר",
  4: "טוב",
  5: "מעולה"
};

export default function AdminRatingWidget({ recommendation, onRatingUpdate, isUpdating }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(recommendation.admin_rating || 0);

  const handleRating = async (rating) => {
    setCurrentRating(rating);
    await onRatingUpdate(recommendation.id, rating);
  };

  const getBoxStyle = (rating) => {
    const isSelected = rating <= (hoverRating || currentRating);
    const baseClasses = "w-8 h-8 border-2 rounded-md flex items-center justify-center font-bold text-xs cursor-pointer transition-all duration-200 transform hover:scale-110";
    
    if (isSelected) {
      return `${baseClasses} bg-yellow-500 border-yellow-500 text-white shadow-md`;
    } else {
      return `${baseClasses} bg-horizon-card border-horizon-secondary text-horizon-accent hover:bg-yellow-500/20 hover:border-yellow-500`;
    }
  };

  return (
    <div className="p-3 bg-horizon-card/30 rounded-lg" dir="rtl">
      <h4 className="text-sm font-semibold text-horizon-text mb-2 text-right">דרג את איכות ההמלצה:</h4>
      <div className="flex items-center justify-end gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <div
            key={rating}
            className={getBoxStyle(rating)}
            onClick={() => !isUpdating && handleRating(rating)}
            onMouseEnter={() => !isUpdating && setHoverRating(rating)}
            onMouseLeave={() => !isUpdating && setHoverRating(0)}
          >
            {rating}
          </div>
        ))}
        {isUpdating && <div className="loader-small mr-2"></div>}
      </div>
      
      <p className="text-xs text-horizon-accent text-right">
        {hoverRating > 0 ? ratingLabels[hoverRating] : 
         currentRating > 0 ? `${currentRating} - ${ratingLabels[currentRating]}` : 
         "1 = לא טוב, 5 = מעולה"}
      </p>
      
      {recommendation.last_rated_by_admin_date && (
         <p className="text-xs text-horizon-accent mt-2 text-right">
            עודכן לאחרונה: {new Date(recommendation.last_rated_by_admin_date).toLocaleString('he-IL')}
        </p>
      )}
    </div>
  );
}
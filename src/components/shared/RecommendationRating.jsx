import React, { useState } from 'react';

const ratingLabels = {
  1: "לא עזר כלל",
  2: "פחות רלוונטי", 
  3: "ככה ככה / טעון שיפור",
  4: "מועיל / עזר קצת",
  5: "מצוין / עזר מאוד"
};

export default function RecommendationRating({ recommendation, onRatingUpdate, hideIfRated = false }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(recommendation.customer_rating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // אם הפרמטר hideIfRated מוגדר ויש דירוג, לא מציגים כלום
  if (hideIfRated && currentRating > 0) {
    return null;
  }

  const handleRating = async (rating) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      setCurrentRating(rating);
      if (onRatingUpdate) {
        await onRatingUpdate(recommendation.id, rating);
      }
    } catch (error) {
      console.error("Error updating rating:", error);
      // Reset on error
      setCurrentRating(recommendation.customer_rating || 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBoxStyle = (rating) => {
    const isSelected = rating <= (hoverRating || currentRating);
    const baseClasses = "w-10 h-10 border-2 rounded-lg flex items-center justify-center font-bold text-sm cursor-pointer transition-all duration-200 transform hover:scale-105";
    
    if (isSelected) {
      return `${baseClasses} bg-horizon-primary border-horizon-primary text-white shadow-lg`;
    } else {
      return `${baseClasses} bg-horizon-card border-horizon-secondary text-horizon-accent hover:bg-horizon-primary/20 hover:border-horizon-primary`;
    }
  };

  return (
    <div className="p-4 bg-horizon-card/30 rounded-lg" dir="rtl">
      <h4 className="text-sm font-semibold text-horizon-text mb-3 text-right">
        איך דירגת את ההמלצה הזו?
      </h4>
      
      <div className="flex items-center justify-end gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <div
            key={rating}
            className={getBoxStyle(rating)}
            onClick={() => !isSubmitting && handleRating(rating)}
            onMouseEnter={() => !isSubmitting && setHoverRating(rating)}
            onMouseLeave={() => !isSubmitting && setHoverRating(0)}
          >
            {rating}
          </div>
        ))}
        {isSubmitting && (
          <div className="w-5 h-5 border-2 border-horizon-primary border-t-transparent rounded-full animate-spin mr-2"></div>
        )}
      </div>
      
      <p className="text-xs text-horizon-accent text-right">
        {hoverRating > 0 ? ratingLabels[hoverRating] : 
         currentRating > 0 ? ratingLabels[currentRating] : 
         "בחר דירוג מ-1 (לא עזר) עד 5 (מצוין)"}
      </p>
      
      {currentRating > 0 && (
        <p className="text-xs text-green-400 mt-2 text-right">
          תודה על הדירוג! זה עוזר לנו לשפר את איכות ההמלצות.
        </p>
      )}
    </div>
  );
}
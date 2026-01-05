import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, Package } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function ChunkedProcessingOverlay({ isVisible, currentChunk, totalChunks, processedItems, totalItems, message }) {
  const percentage = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;
  const itemsPercentage = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="bg-gradient-to-br from-horizon-card to-horizon-surface border-2 border-horizon-primary/30 rounded-3xl p-10 shadow-2xl max-w-lg mx-4 relative overflow-hidden"
          >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-horizon-primary/10 to-horizon-secondary/10 animate-pulse" />
            
            <div className="relative z-10 space-y-6">
              {/* Icon Animation */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-horizon-primary/20 rounded-full blur-xl" />
                  <Package className="w-20 h-20 text-horizon-primary relative z-10" />
                </motion.div>
              </div>

              {/* Title */}
              <div className="text-center">
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-bold text-horizon-text mb-2 bg-gradient-to-r from-horizon-primary to-horizon-secondary bg-clip-text text-transparent"
                >
                  {message || 'מעבד נתונים...'}
                </motion.h3>
                <p className="text-sm text-horizon-accent">
                  מייבא מוצרים מדוח Z לתחזית
                </p>
              </div>

              {/* Progress Stats */}
              <div className="space-y-4">
                {/* Chunks Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-horizon-text">
                      חבילה {currentChunk} מתוך {totalChunks}
                    </span>
                    <span className="text-2xl font-bold text-horizon-primary">
                      {percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-3 bg-horizon-surface/50"
                  />
                </div>

                {/* Items Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-horizon-accent">
                      {processedItems.toLocaleString()} / {totalItems.toLocaleString()} מוצרים
                    </span>
                    <span className="text-sm font-semibold text-horizon-secondary">
                      {itemsPercentage}%
                    </span>
                  </div>
                  <Progress 
                    value={itemsPercentage} 
                    className="h-2 bg-horizon-surface/30"
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-horizon-accent">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-4 h-4" />
                </motion.div>
                <span>שומר נתונים בענן...</span>
              </div>

              {/* Completed Chunks Animation */}
              {currentChunk > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-green-400 text-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{currentChunk - 1} חבילות הושלמו בהצלחה</span>
                </motion.div>
              )}
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-horizon-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-horizon-secondary/10 rounded-full blur-3xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Briefcase, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const EnhancedOrgNode = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.08, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative
        ${selected ? 'ring-4 ring-horizon-primary ring-offset-2 ring-offset-horizon-dark' : ''}
      `}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-horizon-primary border-2 border-white shadow-lg hover:scale-150 transition-transform"
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-horizon-secondary border-2 border-white shadow-lg hover:scale-150 transition-transform"
        style={{ bottom: -6 }}
      />

      <div
        onClick={data.onEdit}
        className="
          bg-gradient-to-br from-horizon-card via-horizon-dark to-horizon-card/80
          backdrop-blur-md
          border-2 border-horizon-primary/60
          rounded-2xl
          p-4
          w-48
          shadow-2xl
          cursor-pointer
          transition-all
          duration-300
          overflow-hidden
          relative
        "
        style={{
          background: isHovered 
            ? 'linear-gradient(135deg, rgba(50, 172, 193, 0.15) 0%, rgba(252, 159, 103, 0.15) 100%)'
            : 'rgba(17, 34, 64, 0.95)',
          boxShadow: isHovered
            ? '0 20px 40px rgba(50, 172, 193, 0.4), 0 0 60px rgba(252, 159, 103, 0.2)'
            : '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Animated Gradient Overlay */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-horizon-primary/20 to-horizon-secondary/20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        <div className="relative z-10 text-center space-y-3">
          {/* Avatar with Glow */}
          <div className="relative inline-block">
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-horizon-primary via-blue-400 to-horizon-secondary rounded-full mx-auto flex items-center justify-center text-white shadow-2xl"
              animate={isHovered ? {
                boxShadow: [
                  '0 0 20px rgba(50, 172, 193, 0.5)',
                  '0 0 40px rgba(252, 159, 103, 0.5)',
                  '0 0 20px rgba(50, 172, 193, 0.5)'
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <User className="w-7 h-7" />
            </motion.div>
            {/* Active Indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-horizon-dark rounded-full" />
          </div>

          {/* Name & Role */}
          <div>
            <h3 
              className="font-bold text-sm text-horizon-text leading-tight mb-1"
              style={{
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)'
              }}
            >
              {data.name}
            </h3>
            <p 
              className="text-xs text-horizon-primary font-semibold"
              style={{
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)'
              }}
            >
              {data.role}
            </p>
          </div>

          {/* Department Badge */}
          {data.department && (
            <Badge 
              className="bg-horizon-secondary/30 text-horizon-secondary border border-horizon-secondary/50 text-[10px] font-bold px-2 py-0.5"
              style={{
                backdropFilter: 'blur(8px)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)'
              }}
            >
              <Briefcase className="w-3 h-3 ml-1 inline" />
              {data.department}
            </Badge>
          )}

          {/* Additional Info - Show on Hover */}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5 pt-2 border-t border-horizon/40"
            >
              {data.email && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-horizon-accent">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{data.email}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-horizon-accent">
                  <Phone className="w-3 h-3" />
                  <span>{data.phone}</span>
                </div>
              )}
              {data.salary && (
                <div 
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/20 border border-green-400/30 rounded-lg py-1"
                  style={{
                    backdropFilter: 'blur(8px)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <DollarSign className="w-3 h-3" />
                  ₪{data.salary.toLocaleString()}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedOrgNode;
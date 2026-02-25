import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { useQuery } from '@tanstack/react-query';
import { AtSign, X } from 'lucide-react';
import { User } from '@/api/entities';

export default function MentionInput({ 
  value = '', 
  onChange, 
  customerEmail,
  placeholder = "כתוב הערה ותייג משתמשים עם @...",
  className = ""
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef(null);

  // טעינת משתמשים רלוונטיים ללקוח
  const { data: relatedUsers = [] } = useQuery({
    queryKey: ['relatedUsers', customerEmail],
    queryFn: async () => {
      if (!customerEmail) return [];
      
      // טעינת כל המשתמשים
      const allUsers = await User.list();
      
      // פילטור משתמשים רלוונטיים: מנהלי כספים ואדמינים
      return allUsers.filter(u => 
        u.user_type === 'financial_manager' || 
        u.role === 'admin'
      );
    },
    enabled: !!customerEmail
  });

  // זיהוי מתי המשתמש מקליד @
  useEffect(() => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@') && lastWord.length > 0) {
      setMentionQuery(lastWord.slice(1)); // הסרת ה-@
      setShowSuggestions(true);
      setCursorPosition(cursorPos);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  }, [value]);

  // סינון משתמשים לפי שאילתת החיפוש
  const filteredUsers = relatedUsers.filter(user => {
    const searchTerm = mentionQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm)
    );
  }).slice(0, 5);

  // בחירת משתמש מהרשימה
  const handleSelectUser = (user) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    // מציאת תחילת ה-@ האחרון
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // החלפת @query ב-@username
    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${user.full_name || user.email} ` + 
      textAfterCursor;
    
    onChange(newText);
    setShowSuggestions(false);
    
    // החזרת הפוקוס
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  // חילוץ משתמשים מתויגים מהטקסט
  const extractTaggedUsers = () => {
    const mentions = value.match(/@[\u0590-\u05FF\w\s]+/g) || [];
    return mentions.map(m => m.slice(1).trim());
  };

  const taggedUsers = extractTaggedUsers();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-horizon-card border-horizon text-horizon-text ${className}`}
        dir="rtl"
      />
      
      {/* רשימת הצעות משתמשים */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute z-50 bg-horizon-card border border-horizon rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto w-full">
          {filteredUsers.map((user, idx) => (
            <button
              key={user.email}
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-2 text-right hover:bg-horizon-dark/50 transition-colors border-b border-horizon last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <AtSign className="w-4 h-4 text-horizon-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-horizon-text">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-horizon-accent">{user.email}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* תצוגת משתמשים מתויגים */}
      {taggedUsers.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {taggedUsers.map((username, idx) => (
            <Badge 
              key={idx} 
              className="bg-horizon-primary/20 text-horizon-primary border-horizon-primary"
            >
              <AtSign className="w-3 h-3 ml-1" />
              {username}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
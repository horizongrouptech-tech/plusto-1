import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Link, CheckCircle, AlertCircle } from "lucide-react";
import { Supplier, User } from '@/api/entities';



export default function AssignSupplierUserModal({ isOpen, onClose, supplier, onAssigned, allUsers }) {
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [creationMode, setCreationMode] = useState('new'); // 'existing' or 'new'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const availableSupplierUsers = allUsers.filter(user => user.user_type === 'supplier_user');

  useEffect(() => {
    if (isOpen && supplier) {
      if (supplier.supplier_user_email) {
        setSelectedUserEmail(supplier.supplier_user_email);
        setCreationMode('existing');
      } else {
        setSelectedUserEmail('');
        setCreationMode('new');
        setNewUserName('');
        setNewUserPhone('');
      }
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, supplier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let targetUserEmail;

      if (creationMode === 'new') {
        if (!newUserName.trim() || !selectedUserEmail.trim() || !newUserPhone.trim()) {
          throw new Error("נא למלא את כל השדות עבור משתמש חדש: שם מלא, אימייל וטלפון.");
        }
        
        // בדוק אם האימייל כבר קיים
        const emailExists = allUsers.some(user => user.email === selectedUserEmail);
        if (emailExists) {
            throw new Error("משתמש עם כתובת אימייל זו כבר קיים במערכת.");
        }

        // צור משתמש חדש
        await User.create({
          full_name: newUserName,
          email: selectedUserEmail,
          phone: newUserPhone,
          user_type: 'supplier_user',
          supplier_id: supplier.id,
          is_approved_by_admin: true,
          onboarding_completed: true,
          last_activity: new Date().toISOString()
        });
        targetUserEmail = selectedUserEmail;

      } else { // existing mode
        if (!selectedUserEmail) {
          throw new Error("נא לבחור משתמש קיים.");
        }
        
        const selectedUser = allUsers.find(user => user.email === selectedUserEmail);
        if (!selectedUser) {
          throw new Error("משתמש לא נמצא.");
        }

        // עדכן את סוג המשתמש ושייך לספק
        await User.update(selectedUser.id, {
          user_type: 'supplier_user',
          supplier_id: supplier.id,
          is_approved_by_admin: true
        });
        targetUserEmail = selectedUserEmail;
      }

      // עדכן את הספק עם אימייל המשתמש
      await Supplier.update(supplier.id, {
        supplier_user_email: targetUserEmail
      });

      setSuccessMessage(`משתמש שויך בהצלחה לספק ${supplier.name}!`);
      
      if (onAssigned) {
        onAssigned({ ...supplier, supplier_user_email: targetUserEmail });
      }

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error("Error assigning user to supplier:", error);
      setErrorMessage(error.message || "שגיאה בשיוך המשתמש לספק.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-horizon-dark text-horizon-text border-horizon" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-horizon-primary">
            שיוך משתמש לספק
          </DialogTitle>
          <DialogDescription className="text-right text-horizon-accent">
            שייך משתמש קיים או צור חדש עבור הספק "{supplier.name}"
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <p className="text-green-400 font-medium">{successMessage}</p>
              <p className="text-horizon-accent text-sm">המודאל יסגר תוך רגע...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* בחירת מצב יצירה */}
            <div className="space-y-4">
              <Label className="text-horizon-text">בחר דרך שיוך:</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={creationMode === 'new' ? 'default' : 'outline'}
                  onClick={() => setCreationMode('new')}
                  disabled={isSubmitting}
                  className={creationMode === 'new' ? 'btn-horizon-primary' : 'border-horizon-accent text-horizon-accent hover:bg-horizon-card'}
                >
                  <UserPlus className="w-4 h-4 ml-2" />
                  צור חדש
                </Button>
                <Button
                  type="button"
                  variant={creationMode === 'existing' ? 'default' : 'outline'}
                  onClick={() => setCreationMode('existing')}
                  disabled={isSubmitting || availableSupplierUsers.length === 0}
                  className={creationMode === 'existing' ? 'btn-horizon-primary' : 'border-horizon-accent text-horizon-accent hover:bg-horizon-card'}
                >
                  <Link className="w-4 h-4 ml-2" />
                  שייך קיים
                </Button>
              </div>
            </div>

            {/* שדות בהתאם למצב */}
            {creationMode === 'new' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUserName" className="text-horizon-text">שם מלא *</Label>
                  <Input
                    id="newUserName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="שם איש הקשר בספק"
                    required
                    className="bg-horizon-card border-horizon text-horizon-text"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newUserEmail" className="text-horizon-text">כתובת אימייל *</Label>
                  <Input
                    id="newUserEmail"
                    type="email"
                    value={selectedUserEmail}
                    onChange={(e) => setSelectedUserEmail(e.target.value)}
                    placeholder="user@supplier.com"
                    required
                    className="bg-horizon-card border-horizon text-horizon-text"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newUserPhone" className="text-horizon-text">טלפון *</Label>
                  <Input
                    id="newUserPhone"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="050-1234567"
                    required
                    className="bg-horizon-card border-horizon text-horizon-text"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="existingUser" className="text-horizon-text">בחר משתמש קיים:</Label>
                {availableSupplierUsers.length > 0 ? (
                  <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail} disabled={isSubmitting}>
                    <SelectTrigger className="bg-horizon-card border-horizon text-horizon-text">
                      <SelectValue placeholder="בחר משתמש ספק קיים" />
                    </SelectTrigger>
                    <SelectContent className="bg-horizon-card border-horizon">
                      {availableSupplierUsers.map((user) => (
                        <SelectItem key={user.email} value={user.email} className="text-horizon-text">
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-horizon-accent text-sm p-3 bg-horizon-card/50 rounded border border-horizon">
                    אין משתמשי ספק זמינים לשיוך. צור משתמש חדש.
                  </div>
                )}
              </div>
            )}

            {/* הודעות שגיאה */}
            {errorMessage && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 p-3 rounded border border-red-500/50">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* כפתורי פעולה */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
                className="border-horizon-accent text-horizon-accent hover:bg-horizon-card"
              >
                ביטול
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="btn-horizon-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    משייך...
                  </>
                ) : (
                  <>
                    <Link className="ml-2 h-4 w-4" />
                    שייך משתמש
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
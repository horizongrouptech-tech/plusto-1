import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GoalComment } from '@/entities/GoalComment';
import { User } from '@/entities/User';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const Comment = ({ comment, author }) => {
    return (
        <div className="flex items-start space-x-3 space-x-reverse text-right">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-horizon-primary text-white flex items-center justify-center text-sm font-bold">
                    {author?.full_name?.charAt(0) || '?'}
                </div>
            </div>
            <div className="flex-1">
                <div className="text-right">
                    <p className="text-sm font-medium text-horizon-text">{author?.full_name || '...טוען'}</p>
                    <p className="text-xs text-horizon-accent">{formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: he })}</p>
                </div>
                <p className="mt-1 text-sm text-horizon-accent text-right whitespace-pre-wrap">{comment.content}</p>
            </div>
        </div>
    );
};

export default function GoalCommentsModal({ goal, isOpen, onClose, users }) {
    const [comments, setComments] = useState([]);
    const [authors, setAuthors] = useState({});
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isPosting
    const [currentUser, setCurrentUser] = useState(null);

    const fetchComments = useCallback(async () => {
        if (!goal?.id) return;
        setIsLoading(true);
        try {
            const [fetchedComments, me] = await Promise.all([
                GoalComment.filter({ goal_id: goal.id }, '-created_date'),
                User.me()
            ]);
            setComments(fetchedComments);
            setCurrentUser(me);

            const authorEmails = [...new Set(fetchedComments.map(c => c.author_email))];
            const fetchedAuthors = {};
            
            // Populate authors from provided 'users' prop
            users.forEach(u => {
                fetchedAuthors[u.email] = u;
            });
            
            // Fill in any missing authors
            for (const email of authorEmails) {
                if (!fetchedAuthors[email]) {
                     // In a real scenario, you might fetch user details if not available
                    fetchedAuthors[email] = { full_name: email, email: email };
                }
            }
            setAuthors(fetchedAuthors);

        } catch (error) {
            console.error("Error fetching comments:", error);
        } finally {
            setIsLoading(false);
        }
    }, [goal?.id, users]);

    useEffect(() => {
        if (isOpen) {
            fetchComments();
        }
    }, [isOpen, fetchComments]);

    const handleAddComment = async () => { // Renamed from handlePostComment
        if (!newComment.trim() || !currentUser || !goal?.id) return;
        setIsSubmitting(true);
        try {
            await GoalComment.create({
                goal_id: goal.id,
                author_email: currentUser.email,
                content: newComment.trim(),
            });
            setNewComment('');
            await fetchComments(); // Refresh comments list
        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl dir-rtl bg-horizon-dark text-white border-horizon">
                <DialogHeader className="text-right">
                    <DialogTitle className="text-horizon-text text-right">הערות עבור: {goal?.name}</DialogTitle>
                    <DialogDescription className="text-horizon-accent text-right">
                        כאן ניתן לדון ולהשאיר עדכונים לגבי היעד או המשימה.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 pr-2 max-h-[400px] overflow-y-auto space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="w-6 h-6 animate-spin text-horizon-primary" />
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map(comment => (
                            <Comment key={comment.id} comment={comment} author={authors[comment.author_email]} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-horizon-accent">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                            אין עדיין הערות.
                        </div>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-horizon-border">
                    <Textarea
                        placeholder="הוסף הערה..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                        className="w-full bg-horizon-card border-horizon text-horizon-text text-right mb-2"
                        disabled={isSubmitting}
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <Button 
                            size="sm"
                            className="btn-horizon-primary"
                            onClick={handleAddComment}
                            disabled={isSubmitting || !newComment.trim()}
                        >
                            {isSubmitting ? <Loader2 className="w-3 h-3 ml-2 animate-spin"/> : <Send className="w-3 h-3 ml-2" />}
                            שלח הערה
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
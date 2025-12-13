import { User } from '@/entities/User';
import { UserActivity } from '@/entities/UserActivity';
import { Recommendation } from '@/entities/Recommendation';
import { BusinessMove } from '@/entities/BusinessMove';
import { FileUpload } from '@/entities/FileUpload';

export const trackActivity = async (actionType, details = {}) => {
  try {
    const user = await User.me();
    if (!user) return;

    let [activity] = await UserActivity.filter({ user_email: user.email });

    const now = new Date().toISOString();

    if (!activity) {
      activity = {
        user_email: user.email,
        session_duration: 0,
        pages_visited: [],
        actions_taken: [],
        recommendations_implemented: 0,
        business_moves_implemented: 0,
        files_uploaded: 0,
        quality_score: 0,
        total_logins: 1,
        registration_date: user.created_date,
      };
    }
    
    activity.last_login = now;

    switch (actionType) {
      case 'LOGIN':
        activity.total_logins = (activity.total_logins || 0) + 1;
        break;
      case 'FILE_UPLOADED':
        activity.files_uploaded = (activity.files_uploaded || 0) + 1;
        break;
      case 'REC_IMPLEMENTED':
        activity.recommendations_implemented = (activity.recommendations_implemented || 0) + 1;
        break;
      case 'MOVE_IMPLEMENTED':
        activity.business_moves_implemented = (activity.business_moves_implemented || 0) + 1;
        break;
      case 'SESSION_UPDATE':
        activity.session_duration = (activity.session_duration || 0) + (details.duration || 5); // Add 5 minutes per update
        break;
    }

    // Recalculate quality score
    const recs = await Recommendation.filter({ customer_email: user.email });
    const moves = await BusinessMove.filter({ customer_email: user.email });
    const uploads = await FileUpload.filter({ created_by: user.email });
    
    activity.recommendations_implemented = recs.filter(r => r.status === 'executed').length;
    activity.business_moves_implemented = moves.filter(m => m.status === 'in_progress' || m.status === 'completed').length;
    activity.files_uploaded = uploads.length;

    let score = 0;
    score += Math.min(activity.total_logins, 10) * 1; // max 10 points
    score += Math.min(activity.files_uploaded, 5) * 4; // max 20 points
    score += Math.min(activity.recommendations_implemented, 10) * 3; // max 30 points
    score += Math.min(activity.business_moves_implemented, 4) * 10; // max 40 points
    activity.quality_score = Math.min(score, 100);

    if (activity.id) {
      await UserActivity.update(activity.id, activity);
    } else {
      await UserActivity.create(activity);
    }
  } catch (error) {
    console.error("Failed to track activity:", error);
  }
};
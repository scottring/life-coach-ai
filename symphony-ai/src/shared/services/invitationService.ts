import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, hasFirebaseCredentials } from './firebase';
import { emailService } from './emailService';

export interface FamilyInvitation {
  id: string;
  contextId: string;
  contextName: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  inviteeName?: string;
  role: 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  inviteCode: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string; // user ID who accepted
}

// Generate a random invite code
const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// localStorage keys
const STORAGE_KEYS = {
  INVITATIONS: 'symphony_invitations'
};

// localStorage helper functions
const getInvitationsFromStorage = (): FamilyInvitation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INVITATIONS);
    if (stored) {
      const invitations = JSON.parse(stored);
      return invitations.map((inv: any) => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        expiresAt: new Date(inv.expiresAt),
        acceptedAt: inv.acceptedAt ? new Date(inv.acceptedAt) : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading invitations from localStorage:', error);
    return [];
  }
};

const saveInvitationsToStorage = (invitations: FamilyInvitation[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(invitations));
  } catch (error) {
    console.error('Error saving invitations to localStorage:', error);
  }
};

export const invitationService = {
  // Send invitation to family member
  async sendFamilyInvitation(
    contextId: string,
    contextName: string,
    inviterName: string,
    inviterEmail: string,
    inviteeEmail: string,
    inviteeName?: string,
    role: 'member' | 'viewer' = 'member'
  ): Promise<FamilyInvitation> {
    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    const newInvitation: FamilyInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      contextId,
      contextName,
      inviterName,
      inviterEmail,
      inviteeEmail,
      inviteeName: inviteeName || '',
      role,
      status: 'pending',
      inviteCode,
      createdAt: new Date(),
      expiresAt
    };

    // Try Firebase first, fallback to localStorage
    if (hasFirebaseCredentials && db) {
      try {
        const invitationData = {
          contextId,
          contextName,
          inviterName,
          inviterEmail,
          inviteeEmail,
          inviteeName: inviteeName || '',
          role,
          status: 'pending',
          inviteCode,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt)
        };

        const docRef = await addDoc(collection(db, 'family_invitations'), invitationData);
        newInvitation.id = docRef.id;
        console.log('📧 Invitation saved to Firestore');
      } catch (error) {
        console.warn('Firestore failed, using localStorage fallback');
        // Fall through to localStorage save
      }
    }

    // Save to localStorage (either as fallback or primary storage)
    const invitations = getInvitationsFromStorage();
    invitations.push(newInvitation);
    saveInvitationsToStorage(invitations);

    // Send email invitation
    try {
      const emailSent = await emailService.sendFamilyInvitationEmail({
        to: inviteeEmail,
        inviterName,
        inviteeName: inviteeName || inviteeEmail.split('@')[0],
        contextName,
        inviteCode
      });

      if (emailSent) {
        console.log('✅ Email invitation sent successfully!');
      } else {
        console.log('📧 Email sending failed, but invitation was saved');
      }
    } catch (error) {
      console.error('❌ Error sending email invitation:', error);
      // Don't fail the invitation creation if email fails
    }

    return newInvitation;
  },

  // Get pending invitations for a context
  async getPendingInvitations(contextId: string): Promise<FamilyInvitation[]> {
    // Try Firebase first, fallback to localStorage
    if (hasFirebaseCredentials && db) {
      try {
        const q = query(
          collection(db, 'family_invitations'),
          where('contextId', '==', contextId),
          where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            contextId: data.contextId,
            contextName: data.contextName,
            inviterName: data.inviterName,
            inviterEmail: data.inviterEmail,
            inviteeEmail: data.inviteeEmail,
            inviteeName: data.inviteeName,
            role: data.role,
            status: data.status,
            inviteCode: data.inviteCode,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || new Date(),
            acceptedAt: data.acceptedAt?.toDate(),
            acceptedBy: data.acceptedBy
          };
        });
      } catch (error) {
        console.warn('Firestore failed, using localStorage fallback');
        // Fall through to localStorage
      }
    }

    // Use localStorage
    const invitations = getInvitationsFromStorage();
    return invitations.filter(inv => 
      inv.contextId === contextId && 
      inv.status === 'pending' &&
      inv.expiresAt > new Date() // Filter out expired invitations
    );
  },

  // Accept invitation by code
  async acceptInvitation(inviteCode: string, userId: string): Promise<FamilyInvitation | null> {
    // Get all invitations
    const invitations = getInvitationsFromStorage();
    const invitation = invitations.find(inv => 
      inv.inviteCode === inviteCode && 
      inv.status === 'pending'
    );

    if (!invitation) {
      throw new Error('Invalid or expired invitation code');
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      throw new Error('This invitation has expired');
    }

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;

    // Save back to localStorage
    saveInvitationsToStorage(invitations);

    // Try to update Firestore if available
    if (hasFirebaseCredentials && db) {
      try {
        const q = query(
          collection(db, 'family_invitations'),
          where('inviteCode', '==', inviteCode),
          where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, {
            status: 'accepted',
            acceptedAt: serverTimestamp(),
            acceptedBy: userId
          });
        }
      } catch (error) {
        console.warn('Could not update Firestore, but localStorage updated');
      }
    }

    return invitation;
  },

  // Get invitations for a user (by email)
  async getInvitationsForUser(email: string): Promise<FamilyInvitation[]> {
    // Try Firebase first, fallback to localStorage
    if (hasFirebaseCredentials && db) {
      try {
        const q = query(
          collection(db, 'family_invitations'),
          where('inviteeEmail', '==', email),
          where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            contextId: data.contextId,
            contextName: data.contextName,
            inviterName: data.inviterName,
            inviterEmail: data.inviterEmail,
            inviteeEmail: data.inviteeEmail,
            inviteeName: data.inviteeName,
            role: data.role,
            status: data.status,
            inviteCode: data.inviteCode,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || new Date(),
            acceptedAt: data.acceptedAt?.toDate(),
            acceptedBy: data.acceptedBy
          };
        });
      } catch (error) {
        console.warn('Firestore failed, using localStorage fallback');
        // Fall through to localStorage
      }
    }

    // Use localStorage
    const invitations = getInvitationsFromStorage();
    return invitations.filter(inv => 
      inv.inviteeEmail === email && 
      inv.status === 'pending' &&
      inv.expiresAt > new Date() // Filter out expired invitations
    );
  },

  // Delete/cancel invitation
  async cancelInvitation(invitationId: string): Promise<void> {
    // Update localStorage
    const invitations = getInvitationsFromStorage();
    const updatedInvitations = invitations.filter(inv => inv.id !== invitationId);
    saveInvitationsToStorage(updatedInvitations);

    // Try to update Firestore if available
    if (hasFirebaseCredentials && db) {
      try {
        const q = query(
          collection(db, 'family_invitations'),
          where('__name__', '==', invitationId)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, {
            status: 'cancelled'
          });
        }
      } catch (error) {
        console.warn('Could not update Firestore, but localStorage updated');
      }
    }
  }
};
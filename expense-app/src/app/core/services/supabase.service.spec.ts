import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockSupabaseClient: any;
  let mockAuthStateCallback: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  };

  const mockSession = {
    access_token: 'token-123',
    user: mockUser
  };

  beforeEach(() => {
    // Reset the mock
    mockAuthStateCallback = null;

    // Create comprehensive mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.resolveTo({
          data: { session: null },
          error: null
        }),
        onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.callFake((callback: any) => {
          mockAuthStateCallback = callback;
          return {
            data: { subscription: {} },
            error: null
          };
        }),
        signUp: jasmine.createSpy('signUp'),
        signInWithPassword: jasmine.createSpy('signInWithPassword'),
        signOut: jasmine.createSpy('signOut'),
        resetPasswordForEmail: jasmine.createSpy('resetPasswordForEmail'),
        updateUser: jasmine.createSpy('updateUser')
      },
      storage: {
        from: jasmine.createSpy('from').and.returnValue({
          upload: jasmine.createSpy('upload'),
          getPublicUrl: jasmine.createSpy('getPublicUrl'),
          download: jasmine.createSpy('download'),
          remove: jasmine.createSpy('remove')
        })
      },
      from: jasmine.createSpy('from')
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    TestBed.configureTestingModule({
      providers: [SupabaseService]
    });

    service = TestBed.inject(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create Supabase client with correct configuration', () => {
      expect(createClient).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.objectContaining({
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        })
      );
    });

    it('should initialize with null user and session', () => {
      expect(service.currentUser).toBeNull();
      expect(service.currentSession).toBeNull();
    });

    it('should call getSession on initialization', () => {
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it('should set up auth state change listener', () => {
      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it('should handle existing session on init', async () => {
      mockSupabaseClient.auth.getSession.and.resolveTo({
        data: { session: mockSession },
        error: null
      });

      // Create new service instance to test initialization
      const newService = new (SupabaseService as any)();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
    });

    it('should handle getSession error on init', async () => {
      spyOn(console, 'error');
      mockSupabaseClient.auth.getSession.and.rejectWith(new Error('Session error'));

      // Create new service instance
      const newService = new (SupabaseService as any)();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(console.error).toHaveBeenCalledWith('Error initializing session:', jasmine.any(Error));
    });
  });

  describe('Auth State Changes', () => {
    it('should update currentUser$ on SIGNED_IN event', (done) => {
      const users: any[] = [];
      service.currentUser$.subscribe(user => users.push(user));

      // Trigger auth state change
      mockAuthStateCallback('SIGNED_IN', mockSession);

      setTimeout(() => {
        expect(users[users.length - 1]).toEqual(mockUser);
        done();
      }, 50);
    });

    it('should update session$ on SIGNED_IN event', (done) => {
      const sessions: any[] = [];
      service.session$.subscribe(session => sessions.push(session));

      mockAuthStateCallback('SIGNED_IN', mockSession);

      setTimeout(() => {
        expect(sessions[sessions.length - 1]).toEqual(mockSession);
        done();
      }, 50);
    });

    it('should clear user on SIGNED_OUT event', (done) => {
      // First sign in
      mockAuthStateCallback('SIGNED_IN', mockSession);

      setTimeout(() => {
        // Then sign out
        mockAuthStateCallback('SIGNED_OUT', null);

        setTimeout(() => {
          expect(service.currentUser).toBeNull();
          expect(service.currentSession).toBeNull();
          done();
        }, 50);
      }, 50);
    });

    it('should log auth state changes', () => {
      spyOn(console, 'log');

      mockAuthStateCallback('SIGNED_IN', mockSession);

      expect(console.log).toHaveBeenCalledWith('Auth state changed:', 'SIGNED_IN');
    });
  });

  describe('signUp()', () => {
    it('should sign up new user successfully', async () => {
      const mockResponse = {
        data: { user: mockUser },
        error: null
      };
      mockSupabaseClient.auth.signUp.and.resolveTo(mockResponse);

      const result = await service.signUp('test@example.com', 'password123', 'Test User');

      expect(result.data).toEqual({ user: mockUser });
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });
    });

    it('should handle sign up error', async () => {
      const mockError = { message: 'Email already exists' };
      mockSupabaseClient.auth.signUp.and.resolveTo({
        data: null,
        error: mockError
      });

      const result = await service.signUp('test@example.com', 'password123', 'Test User');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should catch and return unexpected errors', async () => {
      spyOn(console, 'error');
      const error = new Error('Network error');
      mockSupabaseClient.auth.signUp.and.rejectWith(error);

      const result = await service.signUp('test@example.com', 'password123', 'Test User');

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
      expect(console.error).toHaveBeenCalledWith('Sign up error:', error);
    });
  });

  describe('signIn()', () => {
    it('should sign in successfully', async () => {
      const mockResponse = {
        data: { user: mockUser, session: mockSession },
        error: null
      };
      mockSupabaseClient.auth.signInWithPassword.and.resolveTo(mockResponse);

      const result = await service.signIn('test@example.com', 'password123');

      expect(result.data).toEqual({ user: mockUser, session: mockSession });
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should handle invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials' };
      mockSupabaseClient.auth.signInWithPassword.and.resolveTo({
        data: null,
        error: mockError
      });

      const result = await service.signIn('test@example.com', 'wrongpassword');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should catch and return unexpected errors', async () => {
      spyOn(console, 'error');
      const error = new Error('Network timeout');
      mockSupabaseClient.auth.signInWithPassword.and.rejectWith(error);

      const result = await service.signIn('test@example.com', 'password123');

      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
      expect(console.error).toHaveBeenCalledWith('Sign in error:', error);
    });
  });

  describe('signOut()', () => {
    it('should sign out successfully', async () => {
      mockSupabaseClient.auth.signOut.and.resolveTo({ error: null });

      const result = await service.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(service.currentUser).toBeNull();
      expect(service.currentSession).toBeNull();
    });

    it('should handle sign out error', async () => {
      const mockError = { message: 'Sign out failed' };
      mockSupabaseClient.auth.signOut.and.resolveTo({ error: mockError });

      const result = await service.signOut();

      expect(result.error).toEqual(mockError);
    });

    it('should catch and return unexpected errors', async () => {
      spyOn(console, 'error');
      const error = new Error('Network error');
      mockSupabaseClient.auth.signOut.and.rejectWith(error);

      const result = await service.signOut();

      expect(result.error).toBe(error);
      expect(console.error).toHaveBeenCalledWith('Sign out error:', error);
    });

    it('should clear user and session even on error', async () => {
      // Set up authenticated state
      mockAuthStateCallback('SIGNED_IN', mockSession);
      await new Promise(resolve => setTimeout(resolve, 50));

      const mockError = { message: 'Sign out failed' };
      mockSupabaseClient.auth.signOut.and.resolveTo({ error: mockError });

      await service.signOut();

      expect(service.currentUser).toBeNull();
      expect(service.currentSession).toBeNull();
    });
  });

  describe('resetPassword()', () => {
    it('should send password reset email successfully', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.and.resolveTo({ error: null });

      const result = await service.resetPassword('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        jasmine.objectContaining({
          redirectTo: jasmine.stringContaining('/reset-password')
        })
      );
    });

    it('should handle reset password error', async () => {
      const mockError = { message: 'User not found' };
      mockSupabaseClient.auth.resetPasswordForEmail.and.resolveTo({ error: mockError });

      const result = await service.resetPassword('test@example.com');

      expect(result.error).toEqual(mockError);
    });

    it('should catch and return unexpected errors', async () => {
      spyOn(console, 'error');
      const error = new Error('Network error');
      mockSupabaseClient.auth.resetPasswordForEmail.and.rejectWith(error);

      const result = await service.resetPassword('test@example.com');

      expect(result.error).toBe(error);
      expect(console.error).toHaveBeenCalledWith('Reset password error:', error);
    });

    it('should include correct redirect URL', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.and.resolveTo({ error: null });

      await service.resetPassword('test@example.com');

      const calls = mockSupabaseClient.auth.resetPasswordForEmail.calls.mostRecent();
      expect(calls.args[1].redirectTo).toMatch(/\/reset-password$/);
    });
  });

  describe('updatePassword()', () => {
    it('should update password successfully', async () => {
      mockSupabaseClient.auth.updateUser.and.resolveTo({ error: null });

      const result = await service.updatePassword('newPassword123');

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: 'newPassword123'
      });
    });

    it('should handle update password error', async () => {
      const mockError = { message: 'Password too weak' };
      mockSupabaseClient.auth.updateUser.and.resolveTo({ error: mockError });

      const result = await service.updatePassword('weak');

      expect(result.error).toEqual(mockError);
    });

    it('should catch and return unexpected errors', async () => {
      spyOn(console, 'error');
      const error = new Error('Network error');
      mockSupabaseClient.auth.updateUser.and.rejectWith(error);

      const result = await service.updatePassword('newPassword123');

      expect(result.error).toBe(error);
      expect(console.error).toHaveBeenCalledWith('Update password error:', error);
    });
  });

  describe('Storage Operations', () => {
    describe('uploadFile()', () => {
      it('should upload file successfully', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const mockResponse = { data: { path: 'user/test.jpg' }, error: null };

        const uploadSpy = jasmine.createSpy('upload').and.resolveTo(mockResponse);
        mockSupabaseClient.storage.from.and.returnValue({ upload: uploadSpy });

        const result = await service.uploadFile('receipts', 'user/test.jpg', mockFile);

        expect(result.data).toEqual({ path: 'user/test.jpg' });
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('receipts');
        expect(uploadSpy).toHaveBeenCalledWith('user/test.jpg', mockFile, {
          cacheControl: '3600',
          upsert: false
        });
      });

      it('should handle upload error', async () => {
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const mockError = { message: 'Upload failed' };

        const uploadSpy = jasmine.createSpy('upload').and.resolveTo({
          data: null,
          error: mockError
        });
        mockSupabaseClient.storage.from.and.returnValue({ upload: uploadSpy });

        const result = await service.uploadFile('receipts', 'user/test.jpg', mockFile);

        expect(result.data).toBeNull();
        expect(result.error).toEqual(mockError);
      });

      it('should catch and return unexpected errors', async () => {
        spyOn(console, 'error');
        const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const error = new Error('Network error');

        const uploadSpy = jasmine.createSpy('upload').and.rejectWith(error);
        mockSupabaseClient.storage.from.and.returnValue({ upload: uploadSpy });

        const result = await service.uploadFile('receipts', 'user/test.jpg', mockFile);

        expect(result.data).toBeNull();
        expect(result.error).toBe(error);
        expect(console.error).toHaveBeenCalledWith('Upload file error:', error);
      });
    });

    describe('getPublicUrl()', () => {
      it('should return public URL for file', () => {
        const mockPublicUrl = 'https://example.com/receipts/user/test.jpg';
        const getPublicUrlSpy = jasmine.createSpy('getPublicUrl').and.returnValue({
          data: { publicUrl: mockPublicUrl }
        });
        mockSupabaseClient.storage.from.and.returnValue({ getPublicUrl: getPublicUrlSpy });

        const url = service.getPublicUrl('receipts', 'user/test.jpg');

        expect(url).toBe(mockPublicUrl);
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('receipts');
        expect(getPublicUrlSpy).toHaveBeenCalledWith('user/test.jpg');
      });
    });

    describe('downloadFile()', () => {
      it('should download file successfully', async () => {
        const mockBlob = new Blob(['test content']);
        const mockResponse = { data: mockBlob, error: null };

        const downloadSpy = jasmine.createSpy('download').and.resolveTo(mockResponse);
        mockSupabaseClient.storage.from.and.returnValue({ download: downloadSpy });

        const result = await service.downloadFile('receipts', 'user/test.jpg');

        expect(result.data).toEqual(mockBlob);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('receipts');
        expect(downloadSpy).toHaveBeenCalledWith('user/test.jpg');
      });

      it('should handle download error', async () => {
        const mockError = { message: 'File not found' };

        const downloadSpy = jasmine.createSpy('download').and.resolveTo({
          data: null,
          error: mockError
        });
        mockSupabaseClient.storage.from.and.returnValue({ download: downloadSpy });

        const result = await service.downloadFile('receipts', 'user/test.jpg');

        expect(result.data).toBeNull();
        expect(result.error).toEqual(mockError);
      });

      it('should catch and return unexpected errors', async () => {
        spyOn(console, 'error');
        const error = new Error('Network error');

        const downloadSpy = jasmine.createSpy('download').and.rejectWith(error);
        mockSupabaseClient.storage.from.and.returnValue({ download: downloadSpy });

        const result = await service.downloadFile('receipts', 'user/test.jpg');

        expect(result.data).toBeNull();
        expect(result.error).toBe(error);
        expect(console.error).toHaveBeenCalledWith('Download file error:', error);
      });
    });

    describe('deleteFile()', () => {
      it('should delete file successfully', async () => {
        const mockResponse = { error: null };

        const removeSpy = jasmine.createSpy('remove').and.resolveTo(mockResponse);
        mockSupabaseClient.storage.from.and.returnValue({ remove: removeSpy });

        const result = await service.deleteFile('receipts', 'user/test.jpg');

        expect(result.error).toBeNull();
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('receipts');
        expect(removeSpy).toHaveBeenCalledWith(['user/test.jpg']);
      });

      it('should handle delete error', async () => {
        const mockError = { message: 'Delete failed' };

        const removeSpy = jasmine.createSpy('remove').and.resolveTo({ error: mockError });
        mockSupabaseClient.storage.from.and.returnValue({ remove: removeSpy });

        const result = await service.deleteFile('receipts', 'user/test.jpg');

        expect(result.error).toEqual(mockError);
      });

      it('should catch and return unexpected errors', async () => {
        spyOn(console, 'error');
        const error = new Error('Network error');

        const removeSpy = jasmine.createSpy('remove').and.rejectWith(error);
        mockSupabaseClient.storage.from.and.returnValue({ remove: removeSpy });

        const result = await service.deleteFile('receipts', 'user/test.jpg');

        expect(result.error).toBe(error);
        expect(console.error).toHaveBeenCalledWith('Delete file error:', error);
      });
    });
  });

  describe('Getters', () => {
    it('should return client instance', () => {
      expect(service.client).toBe(mockSupabaseClient);
    });

    it('should return current user', () => {
      mockAuthStateCallback('SIGNED_IN', mockSession);
      expect(service.currentUser).toEqual(mockUser);
    });

    it('should return null when no user', () => {
      expect(service.currentUser).toBeNull();
    });

    it('should return current session', () => {
      mockAuthStateCallback('SIGNED_IN', mockSession);
      expect(service.currentSession).toEqual(mockSession);
    });

    it('should return null when no session', () => {
      expect(service.currentSession).toBeNull();
    });

    it('should return true for isAuthenticated when session exists', () => {
      mockAuthStateCallback('SIGNED_IN', mockSession);
      expect(service.isAuthenticated).toBe(true);
    });

    it('should return false for isAuthenticated when no session', () => {
      expect(service.isAuthenticated).toBe(false);
    });

    it('should return userId when user exists', () => {
      mockAuthStateCallback('SIGNED_IN', mockSession);
      expect(service.userId).toBe('user-123');
    });

    it('should return null userId when no user', () => {
      expect(service.userId).toBeNull();
    });
  });
});

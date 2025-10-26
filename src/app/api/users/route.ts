import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllUsers, 
  getUserByTelegramId, 
  updateUser, 
  deleteUser,
  isUserAdmin 
} from '@/lib/database';

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminTelegramId = searchParams.get('adminId');
    
    if (!adminTelegramId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    // Check if requester is admin
    const isAdmin = await isUserAdmin(parseInt(adminTelegramId));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users - Update user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminTelegramId, targetTelegramId, updates } = body;

    if (!adminTelegramId || !targetTelegramId) {
      return NextResponse.json({ error: 'Admin ID and target user ID required' }, { status: 400 });
    }

    // Check if requester is admin
    const isAdmin = await isUserAdmin(adminTelegramId);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Don't allow changing admin's own role unless there are other admins
    if (adminTelegramId === targetTelegramId && updates.role === 'user') {
      const allUsers = await getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove admin role - at least one admin must exist' 
        }, { status: 400 });
      }
    }

    const updatedUser = await updateUser(targetTelegramId, updates);
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminTelegramId = searchParams.get('adminId');
    const targetTelegramId = searchParams.get('targetId');

    if (!adminTelegramId || !targetTelegramId) {
      return NextResponse.json({ error: 'Admin ID and target user ID required' }, { status: 400 });
    }

    // Check if requester is admin
    const isAdmin = await isUserAdmin(parseInt(adminTelegramId));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Don't allow admin to delete themselves if they're the only admin
    if (adminTelegramId === targetTelegramId) {
      const allUsers = await getAllUsers();
      const adminCount = allUsers.filter(u => u.role === 'admin').length;
      
      if (adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the only admin account' 
        }, { status: 400 });
      }
    }

    const deleted = await deleteUser(parseInt(targetTelegramId));
    
    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

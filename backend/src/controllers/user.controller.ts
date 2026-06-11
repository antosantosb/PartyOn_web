import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from '@partyon/schemas';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Datos inválidos' });
    }

    const { name, email, role, password } = parsed.data;

    // Verify email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'USER_CREATED',
        details: `User created: ${user.email} (${user.role})`,
        userId: (req as any).user?.userId || null,
      },
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Datos inválidos' });
    }

    const { name, email, role } = parsed.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Check email uniqueness if email is changed
    if (email && email.toLowerCase() !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (emailConflict) {
        return res.status(400).json({ error: 'El correo electrónico ya está registrado por otro usuario' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email: email.toLowerCase() }),
        ...(role !== undefined && { role }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'USER_UPDATED',
        details: `User updated: ${updatedUser.email} (${updatedUser.role})`,
        userId: (req as any).user?.userId || null,
      },
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Contraseña inválida' });
    }

    const { password } = parsed.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        severity: 'INFO',
        action: 'USER_PASSWORD_RESET',
        details: `Password reset for user: ${existingUser.email}`,
        userId: (req as any).user?.userId || null,
      },
    });

    res.json({ success: true, message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUserId = (req as any).user?.userId;

    if (id === currentUserId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await prisma.user.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        severity: 'WARNING',
        action: 'USER_DELETED',
        details: `User deleted: ${existingUser.email}`,
        userId: currentUserId || null,
      },
    });

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

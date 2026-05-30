import { z } from "zod";
import {
  boundedString,
  longText,
  emailSchema,
  passwordSchema,
  uuidSchema,
  roleAssignableSchema,
  assetTypeSchema,
  assetStatusSchema,
  prioritySchema,
  ticketStatusSchema,
  credentialTypeSchema,
} from "./common";

/* ------------------------------- Auth ------------------------------- */

// Логин намеренно мягкий: не применяем формат email и парольную политику,
// чтобы не блокировать существующие учётные записи.
export const loginSchema = z
  .object({
    email: z.string().min(1).max(255),
    password: z.string().min(1).max(128),
  })
  .passthrough();

export const createOrgSchema = z
  .object({
    slug: z.string().min(1).max(100),
    name: z.string().trim().min(1, "Укажите название").max(255),
    adminEmail: emailSchema,
    adminPassword: passwordSchema,
    adminName: z.string().trim().min(1, "Укажите имя администратора").max(255),
    department: boundedString(255).optional(),
  })
  .passthrough();

/* ----------------------------- Employees ---------------------------- */

export const employeeCreateSchema = z
  .object({
    department: z.string().trim().min(1, "Укажите отдел").max(255),
    fullName: z.string().trim().min(1, "Укажите ФИО").max(255),
    mobile: boundedString(100).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleAssignableSchema.optional(),
  })
  .passthrough();

export const employeeUpdateSchema = z
  .object({
    department: z.string().trim().min(1).max(255).optional(),
    fullName: z.string().trim().min(1).max(255).optional(),
    mobile: boundedString(100).optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    role: roleAssignableSchema.optional(),
  })
  .passthrough();

/* ---------------------------- Departments --------------------------- */

export const departmentSchema = z
  .object({
    name: z.string().trim().min(1, "Укажите название отдела").max(255),
  })
  .passthrough();

/* ---------------------------- Credentials --------------------------- */
// password здесь — это ХРАНИМЫЙ секрет (от устройства/сервиса), а не пароль
// входа в систему, поэтому парольная политика к нему НЕ применяется.

export const credentialCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Укажите название").max(255),
    password: z.string().min(1).max(2048),
    assetId: uuidSchema.optional(),
    credentialType: credentialTypeSchema.optional(),
    username: boundedString(255).optional(),
    url: boundedString(500).optional(),
    notes: longText().optional(),
  })
  .passthrough();

export const credentialUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    password: z.string().min(1).max(2048).optional(),
    assetId: uuidSchema.nullable().optional(),
    credentialType: credentialTypeSchema.optional(),
    username: boundedString(255).optional(),
    url: boundedString(500).optional(),
    notes: longText().optional(),
  })
  .passthrough();

/* ------------------------------ Assets ------------------------------ */

const hardwareSpecsSchema = z
  .object({
    cpu: boundedString(255).optional(),
    ramGb: z.number().int().min(0).max(1_000_000).optional(),
    storage: boundedString(255).optional(),
    osName: boundedString(255).optional(),
    osVersion: boundedString(100).optional(),
    ipAddress: boundedString(100).optional(),
    macAddress: boundedString(100).optional(),
    hostname: boundedString(255).optional(),
  })
  .passthrough();

const assetBaseShape = {
  subtype: boundedString(100).optional(),
  inventoryNumber: boundedString(100).optional(),
  manufacturer: boundedString(255).optional(),
  model: boundedString(255).optional(),
  serialNumber: boundedString(255).optional(),
  status: assetStatusSchema.optional(),
  location: boundedString(255).optional(),
  department: boundedString(255).optional(),
  responsibleEmployeeId: uuidSchema.optional(),
  assignedEmployeeId: uuidSchema.optional(),
  parentAssetId: uuidSchema.optional(),
  purchaseDate: boundedString(40).optional(),
  warrantyUntil: boundedString(40).optional(),
  notes: longText().optional(),
  hardwareSpecs: hardwareSpecsSchema.optional(),
};

export const assetCreateSchema = z
  .object({
    assetType: assetTypeSchema,
    name: z.string().trim().min(1, "Укажите название").max(255),
    ...assetBaseShape,
  })
  .passthrough();

export const assetUpdateSchema = z
  .object({
    assetType: assetTypeSchema.optional(),
    name: z.string().trim().min(1).max(255).optional(),
    ...assetBaseShape,
  })
  .passthrough();

export const softwareCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Укажите название").max(255),
    version: boundedString(100).optional(),
    licenseKey: boundedString(2048).optional(),
    installedAt: boundedString(40).optional(),
    notes: longText().optional(),
  })
  .passthrough();

export const softwareUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    version: boundedString(100).optional(),
    licenseKey: boundedString(2048).optional(),
    installedAt: boundedString(40).optional(),
    notes: longText().optional(),
  })
  .passthrough();

/* ------------------------------ Tickets ----------------------------- */

export const ticketCreateSchema = z
  .object({
    problemType: boundedString(100).optional(),
    title: longText().optional(),
    description: longText().optional(),
    priority: prioritySchema.optional(),
    remoteAccess: z.boolean().optional(),
    assetId: boundedString(100).optional(),
  })
  .passthrough();

export const ticketUpdateSchema = z
  .object({
    problemType: boundedString(100).optional(),
    title: longText().optional(),
    description: longText().optional(),
    priority: prioritySchema.optional(),
    remoteAccess: z.boolean().optional(),
    status: ticketStatusSchema.optional(),
    assignee: boundedString(255).nullable().optional(),
    deadline: z.string().max(60).nullable().optional(),
    resolution: longText().nullable().optional(),
  })
  .passthrough();

export const ticketCommentSchema = z
  .object({
    text: z.string().trim().min(1, "Комментарий не может быть пустым").max(10000),
  })
  .passthrough();

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'AREA_OWNER', 'SAFETY_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL_LOTO');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CLOSED', 'CLOSED_VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_owners" (
    "area_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "area_owners_pkey" PRIMARY KEY ("area_id","user_id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" TEXT NOT NULL,
    "permit_number" TEXT NOT NULL,
    "type" "PermitType" NOT NULL,
    "status" "PermitStatus" NOT NULL DEFAULT 'DRAFT',
    "requester_id" TEXT NOT NULL,
    "contractor_team" TEXT NOT NULL,
    "work_description" TEXT NOT NULL,
    "plant_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "equipment_id" TEXT,
    "location_detail" TEXT NOT NULL,
    "planned_start" TIMESTAMP(3) NOT NULL,
    "planned_end" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "hazards_identified" TEXT[],
    "ppe_required" TEXT[],
    "precautions_done" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "closure_notes" TEXT,
    "verified_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hot_work_details" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "hot_work_type" TEXT NOT NULL,
    "fire_watch_assigned" TEXT NOT NULL,
    "extinguisher_type" TEXT NOT NULL,
    "combustibles_cleared_m" DOUBLE PRECISION NOT NULL,
    "gas_test_lel" DOUBLE PRECISION NOT NULL,
    "gas_test_o2" DOUBLE PRECISION NOT NULL,
    "gas_test_time" TIMESTAMP(3) NOT NULL,
    "gas_tested_by" TEXT NOT NULL,

    CONSTRAINT "hot_work_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confined_space_details" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "entry_point" TEXT NOT NULL,
    "atm_test_o2" DOUBLE PRECISION NOT NULL,
    "atm_test_lel" DOUBLE PRECISION NOT NULL,
    "atm_test_h2s" DOUBLE PRECISION NOT NULL,
    "atm_test_co" DOUBLE PRECISION NOT NULL,
    "atm_test_time" TIMESTAMP(3) NOT NULL,
    "atm_tested_by" TEXT NOT NULL,
    "standby_attendant" TEXT NOT NULL,
    "rescue_plan" TEXT NOT NULL,
    "ventilation_method" TEXT NOT NULL,
    "entry_exit_log" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "confined_space_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "height_work_details" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "height_metres" DOUBLE PRECISION NOT NULL,
    "access_method" TEXT NOT NULL,
    "fall_arrest_equip" TEXT NOT NULL,
    "anchor_checked" BOOLEAN NOT NULL,
    "barricading_below" BOOLEAN NOT NULL,

    CONSTRAINT "height_work_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electrical_loto_details" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "equipment_tag" TEXT NOT NULL,
    "voltage_level" TEXT NOT NULL,
    "isolation_points" JSONB NOT NULL,
    "lock_numbers" TEXT[],
    "tag_numbers" TEXT[],
    "earthing_applied" BOOLEAN NOT NULL,
    "tested_dead_by" TEXT NOT NULL,

    CONSTRAINT "electrical_loto_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_approvals" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permit_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" "PermitStatus",
    "to_status" "PermitStatus",
    "field_name" TEXT,
    "old_value" TEXT,
    "new_value" TEXT,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_requests" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "requested_hours" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approver_id" TEXT,
    "status" "ExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plants_code_key" ON "plants"("code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tag_key" ON "equipment"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "permits_permit_number_key" ON "permits"("permit_number");

-- CreateIndex
CREATE UNIQUE INDEX "hot_work_details_permit_id_key" ON "hot_work_details"("permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "confined_space_details_permit_id_key" ON "confined_space_details"("permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "height_work_details_permit_id_key" ON "height_work_details"("permit_id");

-- CreateIndex
CREATE UNIQUE INDEX "electrical_loto_details_permit_id_key" ON "electrical_loto_details"("permit_id");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_owners" ADD CONSTRAINT "area_owners_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_owners" ADD CONSTRAINT "area_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permits" ADD CONSTRAINT "permits_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hot_work_details" ADD CONSTRAINT "hot_work_details_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confined_space_details" ADD CONSTRAINT "confined_space_details_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "height_work_details" ADD CONSTRAINT "height_work_details_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electrical_loto_details" ADD CONSTRAINT "electrical_loto_details_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_approvals" ADD CONSTRAINT "permit_approvals_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_approvals" ADD CONSTRAINT "permit_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`backup_folder_path` text,
	`theme` text DEFAULT 'system' NOT NULL,
	`ai_api_key_encrypted` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text,
	`changed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_client_idx` ON `audit_log` (`client_id`);--> statement-breakpoint
CREATE TABLE `australian_study_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`institution_provider` text,
	`course` text,
	`course_level` text,
	`coe_reference` text,
	`offer_letter_reference` text,
	`intended_start_date` text,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `australian_study_entries_client_idx` ON `australian_study_entries` (`client_id`);--> statement-breakpoint
CREATE TABLE `checklist_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checklist_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_item_id` text NOT NULL,
	`gsr_document_id` text NOT NULL,
	`status` text NOT NULL,
	`ai_notes` text,
	`evaluated_at` text NOT NULL,
	FOREIGN KEY (`checklist_item_id`) REFERENCES `checklist_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gsr_document_id`) REFERENCES `gsr_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_document_id` text NOT NULL,
	`requirement_text` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`checklist_document_id`) REFERENCES `checklist_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `checklist_items_document_idx` ON `checklist_items` (`checklist_document_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`status` text DEFAULT 'red' NOT NULL,
	`status_note` text,
	`current_stage` text DEFAULT 'information' NOT NULL,
	`target_intake_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_document_links` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`related_document_id` text NOT NULL,
	`relationship_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_information_links` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_information_links_document_idx` ON `document_information_links` (`document_id`);--> statement-breakpoint
CREATE TABLE `document_merges` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`result_document_id` text NOT NULL,
	`source_document_ids_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`result_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`category` text NOT NULL,
	`custom_category` text,
	`label` text NOT NULL,
	`file_path` text NOT NULL,
	`notes` text,
	`replaces_document_id` text,
	`is_current_version` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_client_idx` ON `documents` (`client_id`);--> statement-breakpoint
CREATE INDEX `documents_category_idx` ON `documents` (`client_id`,`category`);--> statement-breakpoint
CREATE TABLE `education_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`level` text,
	`institution` text,
	`course` text,
	`start_date` text,
	`end_date` text,
	`qualification` text,
	`final_grade` text,
	`grade_breakdown` text,
	`institution_contact` text,
	`clubs_certifications` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `education_entries_client_idx` ON `education_entries` (`client_id`);--> statement-breakpoint
CREATE TABLE `employment_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`employer` text,
	`job_title` text,
	`employment_type` text,
	`start_date` text,
	`end_date` text,
	`monthly_salary` text,
	`duties` text,
	`employer_contact` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `employment_entries_client_idx` ON `employment_entries` (`client_id`);--> statement-breakpoint
CREATE TABLE `english_test_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`test_date` text,
	`overall_score` text,
	`component_scores` text,
	`trf_reference` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `english_test_scores_client_idx` ON `english_test_scores` (`client_id`);--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`source` text,
	`title` text NOT NULL,
	`url` text,
	`publication_info` text,
	`excerpt` text,
	`notes` text,
	`proves_what` text,
	`document_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `evidence_items_client_idx` ON `evidence_items` (`client_id`);--> statement-breakpoint
CREATE TABLE `gsr_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`title` text DEFAULT 'GSR' NOT NULL,
	`status` text DEFAULT 'drafting' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gsr_draft_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`gsr_document_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`label` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`gsr_document_id`) REFERENCES `gsr_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gsr_draft_versions_document_idx` ON `gsr_draft_versions` (`gsr_document_id`);--> statement-breakpoint
CREATE TABLE `gsr_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`gsr_document_id` text NOT NULL,
	`title` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`content_html` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gsr_document_id`) REFERENCES `gsr_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gsr_sections_document_idx` ON `gsr_sections` (`gsr_document_id`);--> statement-breakpoint
CREATE TABLE `gsr_statement_evidence_links` (
	`id` text PRIMARY KEY NOT NULL,
	`gsr_statement_id` text NOT NULL,
	`evidence_item_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gsr_statement_id`) REFERENCES `gsr_statements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_item_id`) REFERENCES `evidence_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gsr_statements` (
	`id` text PRIMARY KEY NOT NULL,
	`gsr_section_id` text NOT NULL,
	`text` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`gsr_section_id`) REFERENCES `gsr_sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gsr_statements_section_idx` ON `gsr_statements` (`gsr_section_id`);--> statement-breakpoint
CREATE TABLE `immigration_history_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`description` text,
	`date_from` text,
	`date_to` text,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `immigration_history_entries_client_idx` ON `immigration_history_entries` (`client_id`);--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`sponsor_id` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`amount` text,
	`requires_verification` integer DEFAULT false NOT NULL,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `income_sources_sponsor_idx` ON `income_sources` (`sponsor_id`);--> statement-breakpoint
CREATE TABLE `information_field_history` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`field_name` text NOT NULL,
	`previous_value` text,
	`new_value` text,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `information_field_history_entity_idx` ON `information_field_history` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `personal_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`contact_info` text,
	`residence_info` text,
	`next_of_kin` text,
	`family_info` text,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`relationship_to_client` text,
	`contact_info` text,
	`custom_fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sponsors_client_idx` ON `sponsors` (`client_id`);--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`verification_record_id` text NOT NULL,
	`document_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`verification_record_id`) REFERENCES `verification_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification_records` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`subject_entity_type` text NOT NULL,
	`subject_entity_id` text NOT NULL,
	`what_is_being_verified` text NOT NULL,
	`reason` text,
	`contact_name` text,
	`contact_details` text,
	`method` text,
	`date_contacted` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`response` text,
	`date_verified` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verification_records_client_idx` ON `verification_records` (`client_id`);--> statement-breakpoint
CREATE INDEX `verification_records_subject_idx` ON `verification_records` (`subject_entity_type`,`subject_entity_id`);
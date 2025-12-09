"use client";

import type { ComponentProps } from "react";
import AssignmentBuilder from "./AssignmentBuilder";

export type AssignmentWizardProps = ComponentProps<typeof AssignmentBuilder>;

export default function AssignmentWizard(props: AssignmentWizardProps) {
  return <AssignmentBuilder {...props} />;
}

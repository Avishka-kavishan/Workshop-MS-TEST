import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, updateDb, AipHeaderTemplate } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const body = await request.json();

    const branchId = body.branchId || user?.organizationId || 'org-moe-ict';
    const branchName = body.branchName || user?.organizationName || 'MOE ICT Branch';

    let updatedTemplate: AipHeaderTemplate | null = null;

    await updateDb((data) => {
      if (!data.aipHeaderTemplates) data.aipHeaderTemplates = [];

      // Find existing template for this branch or id
      const existingIdx = data.aipHeaderTemplates.findIndex(
        (t) => (body.id && t.id === body.id) || (t.branchId && t.branchId === branchId)
      );

      if (existingIdx !== -1) {
        data.aipHeaderTemplates[existingIdx] = {
          ...data.aipHeaderTemplates[existingIdx],
          name: body.name || data.aipHeaderTemplates[existingIdx].name,
          phaseTitle: body.phaseTitle || data.aipHeaderTemplates[existingIdx].phaseTitle,
          targetTitle: body.targetTitle || data.aipHeaderTemplates[existingIdx].targetTitle,
          mainResponsibility: body.mainResponsibility || data.aipHeaderTemplates[existingIdx].mainResponsibility,
          mainContactNo: body.mainContactNo || data.aipHeaderTemplates[existingIdx].mainContactNo,
          overallResponsibility: body.overallResponsibility || data.aipHeaderTemplates[existingIdx].overallResponsibility,
          overallContactNo: body.overallContactNo || data.aipHeaderTemplates[existingIdx].overallContactNo,
          footnote: body.footnote !== undefined ? body.footnote : data.aipHeaderTemplates[existingIdx].footnote,
          updatedAt: new Date().toISOString(),
        };
        updatedTemplate = data.aipHeaderTemplates[existingIdx];
      } else {
        const newTemplate: AipHeaderTemplate = {
          id: body.id || `tpl-${randomUUID()}`,
          branchId,
          name: body.name || `${branchName} Template`,
          phaseTitle: body.phaseTitle || '2. Implementation Phase',
          targetTitle: body.targetTitle || 'Overall Physical and Financial Targets',
          mainResponsibility: body.mainResponsibility || branchName,
          mainContactNo: body.mainContactNo || '0112785000',
          overallResponsibility: body.overallResponsibility || 'Director of Education',
          overallContactNo: body.overallContactNo || '0112785111',
          footnote: body.footnote !== undefined ? body.footnote : `* Implementation targets governed under ${branchName} operational mandate.`,
          isDefault: false,
          createdBy: user?.id || 'unknown',
          creatorName: user?.name || branchName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.aipHeaderTemplates.push(newTemplate);
        updatedTemplate = newTemplate;
      }
    });

    return NextResponse.json({ success: true, template: updatedTemplate });
  } catch (error: any) {
    console.error('Error saving AIP header template:', error);
    return NextResponse.json(
      { error: 'Failed to save template', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}

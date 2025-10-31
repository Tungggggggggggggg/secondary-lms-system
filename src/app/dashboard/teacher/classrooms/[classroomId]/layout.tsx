import ClassroomTabs from "@/components/teacher/classroom/ClassroomTabs";
import ClassroomHeader from "@/components/teacher/classroom/ClassroomHeader";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type Props = {
    children: React.ReactNode;
    params: { classroomId: string };
};

export default async function ClassroomLayout({ children, params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "TEACHER") {
        notFound();
    }

    const { classroomId } = params;

    // Fetch classroom details for header (server-side)
    const classroom = await fetch(
        `${
            process.env.NEXT_PUBLIC_BASE_URL ?? ""
        }/api/classrooms/${classroomId}`,
        { cache: "no-store" }
    )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    return (
        <div className="px-6 py-4">
            {classroom ? (
                <ClassroomHeader classroom={classroom} />
            ) : (
                <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold">Lớp học</h1>
                            <p className="opacity-90 text-sm">
                                Mã lớp: {classroomId}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <ClassroomTabs classroomId={classroomId} />

            <div className="mt-6">{children}</div>
        </div>
    );
}

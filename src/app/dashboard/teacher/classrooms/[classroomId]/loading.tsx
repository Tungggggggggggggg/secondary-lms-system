export default function LoadingClassroom() {
    return (
        <div className="space-y-4">
            <div className="h-28 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-1/2 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
            <div className="grid gap-4 md:grid-cols-3">
                <div className="h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 md:col-span-2" />
                <div className="h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>
        </div>
    );
}



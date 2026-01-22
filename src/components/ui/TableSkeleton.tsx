export interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="flex-1"
                        >
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

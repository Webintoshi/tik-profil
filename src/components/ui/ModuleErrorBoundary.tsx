"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    moduleName?: string;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ModuleErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error(`Module Error [${this.props.moduleName || "Unknown"}]:`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-dark-800/50 border border-dark-700/50 text-center">
                    <div className="h-14 w-14 rounded-full bg-accent-orange/15 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-7 w-7 text-accent-orange" />
                    </div>
                    <h3 className="text-lg font-semibold text-dark-100 mb-2">
                        Modül Bakımda
                    </h3>
                    <p className="text-sm text-dark-400 mb-4 max-w-xs">
                        {this.props.moduleName
                            ? `"${this.props.moduleName}" modülü şu anda kullanılamıyor.`
                            : "Bu modül şu anda kullanılamıyor."}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-dark-200 text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tekrar Dene
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// HOC for wrapping dynamic modules
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    moduleName: string
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ModuleErrorBoundary moduleName={moduleName}>
                <WrappedComponent {...props} />
            </ModuleErrorBoundary>
        );
    };
}

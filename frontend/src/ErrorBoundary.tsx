import React from 'react'; 
export class ErrorBoundary extends React.Component<any, {hasError: boolean, error: any}> { 
    constructor(props: any) { 
        super(props); 
        this.state = { hasError: false, error: null }; 
    } 
    static getDerivedStateFromError(error: any) { 
        return { hasError: true, error }; 
    } 
    render() { 
        if (this.state.hasError) { 
            return (
                <div style={{padding: 20, color: 'red'}}>
                    <h1>Error Crash!</h1>
                    <pre>{String(this.state.error.stack)}</pre>
                </div>
            ); 
        } 
        return this.props.children; 
    } 
}

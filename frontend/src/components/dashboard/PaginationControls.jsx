import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import "../../styles/dashboard-enterprise.css";

/**
 * PaginationControls - Reusable pagination component
 * Props:
 *   - currentPage: number
 *   - totalPages: number
 *   - pageSize: number
 *   - totalCount: number
 *   - onPageChange: (page: number) => void
 *   - onPageSizeChange: (size: number) => void
 *   - pageSizeOptions: number[] (default: [10, 20, 50, 100])
 *   - disabled: boolean (loading state)
 */
const PaginationControls = ({
    currentPage = 1,
    totalPages = 1,
    pageSize = 20,
    totalCount = 0,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    disabled = false
}) => {
    const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return (
        <div className="pagination-controls">
            <div className="pagination-info">
                <span className="pagination-count">
                    Showing {startItem}-{endItem} of {totalCount}
                </span>
                <div className="pagination-page-size">
                    <label htmlFor="pageSize">Rows per page:</label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        disabled={disabled}
                        className="pagination-select"
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pagination-buttons">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={disabled || currentPage === 1}
                    className="pagination-btn"
                    title="First page"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={disabled || currentPage === 1}
                    className="pagination-btn"
                    title="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                <span className="pagination-page-indicator">
                    Page {currentPage} of {totalPages}
                </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={disabled || currentPage >= totalPages}
                    className="pagination-btn"
                    title="Next page"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={disabled || currentPage >= totalPages}
                    className="pagination-btn"
                    title="Last page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationControls;

"""
Script để cập nhật report_date trong bảng daily_branch_metrics
Hỗ trợ nhiều chi nhánh với các range khác nhau
"""
import sys
from datetime import date, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cấu hình cho từng chi nhánh
BRANCH_CONFIGS = {
    2: {
        "start_date": date(2025, 2, 8),
        "end_date": date(2025, 11, 19),
        "new_end_date": date(2025, 12, 31)
    },
    10: {
        "start_date": date(2023, 9, 30),
        "end_date": date(2025, 12, 13),
        "new_end_date": date(2025, 12, 31)
    }
}


def get_database_url():
    """Build database URL"""
    if settings.DATABASE_URL:
        return settings.DATABASE_URL
    return f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}?charset=utf8mb4"


def get_branch_config(branch_id: int, start_date_str: str = None, end_date_str: str = None, new_end_date_str: str = None):
    """
    Lấy cấu hình cho branch_id hoặc từ tham số
    
    Args:
        branch_id: ID chi nhánh
        start_date_str: Ngày bắt đầu (format: YYYY-MM-DD)
        end_date_str: Ngày kết thúc cũ (format: YYYY-MM-DD)
        new_end_date_str: Ngày kết thúc mới (format: YYYY-MM-DD)
    
    Returns:
        dict với start_date, end_date, new_end_date, days_shift
    """
    if branch_id in BRANCH_CONFIGS:
        config = BRANCH_CONFIGS[branch_id].copy()
    else:
        if not all([start_date_str, end_date_str, new_end_date_str]):
            raise ValueError(f"Branch {branch_id} không có cấu hình mặc định. Cần cung cấp --start-date, --end-date, và --new-end-date")
        config = {
            "start_date": date.fromisoformat(start_date_str),
            "end_date": date.fromisoformat(end_date_str),
            "new_end_date": date.fromisoformat(new_end_date_str)
        }
    
    # Override với tham số nếu có
    if start_date_str:
        config["start_date"] = date.fromisoformat(start_date_str)
    if end_date_str:
        config["end_date"] = date.fromisoformat(end_date_str)
    if new_end_date_str:
        config["new_end_date"] = date.fromisoformat(new_end_date_str)
    
    # Tính số ngày dịch chuyển
    config["days_shift"] = (config["new_end_date"] - config["end_date"]).days
    
    return config


def update_report_dates(branch_id: int = 2, start_date_str: str = None, end_date_str: str = None, 
                       new_end_date_str: str = None, dry_run: bool = True):
    """
    Cập nhật report_date cho các records trong daily_branch_metrics
    
    Args:
        branch_id: ID chi nhánh (mặc định: 2)
        start_date_str: Ngày bắt đầu (format: YYYY-MM-DD, optional)
        end_date_str: Ngày kết thúc cũ (format: YYYY-MM-DD, optional)
        new_end_date_str: Ngày kết thúc mới (format: YYYY-MM-DD, optional)
        dry_run: Nếu True, chỉ hiển thị thông tin mà không cập nhật (mặc định: True)
    """
    try:
        # Lấy cấu hình cho branch
        config = get_branch_config(branch_id, start_date_str, end_date_str, new_end_date_str)
        start_date = config["start_date"]
        end_date = config["end_date"]
        new_end_date = config["new_end_date"]
        days_shift = config["days_shift"]
        
        # Kết nối database
        database_url = get_database_url()
        engine = create_engine(database_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        logger.info(f"Số ngày dịch chuyển: {days_shift} ngày")
        logger.info(f"Ngày cuối cũ: {end_date} -> Ngày cuối mới: {new_end_date}")
        
        # Lấy danh sách records cần cập nhật
        query = text("""
            SELECT id, branch_id, report_date 
            FROM daily_branch_metrics 
            WHERE branch_id = :branch_id 
            AND report_date >= :start_date 
            AND report_date <= :end_date
            ORDER BY report_date ASC
        """)
        
        result = db.execute(
            query,
            {
                "branch_id": branch_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        
        records = result.fetchall()
        logger.info(f"Tìm thấy {len(records)} records cần cập nhật cho branch_id={branch_id}")
        
        if len(records) == 0:
            logger.warning("Không tìm thấy records nào để cập nhật!")
            db.close()
            return
        
        # Hiển thị thông tin trước khi cập nhật
        logger.info("\n=== THÔNG TIN CẬP NHẬT ===")
        logger.info(f"Branch ID: {branch_id}")
        logger.info(f"Range ngày cũ: {start_date} đến {end_date}")
        logger.info(f"Số ngày dịch chuyển: +{days_shift} ngày")
        logger.info(f"Range ngày mới: {start_date + timedelta(days=days_shift)} đến {end_date + timedelta(days=days_shift)}")
        logger.info(f"\nDanh sách 10 records đầu tiên:")
        for i, record in enumerate(records[:10]):
            old_date = record[2]
            new_date = old_date + timedelta(days=days_shift)
            logger.info(f"  ID={record[0]}: {old_date} -> {new_date}")
        
        if len(records) > 10:
            logger.info(f"  ... và {len(records) - 10} records khác")
        
        # Kiểm tra xung đột: xem có records nào trong range mới đã tồn tại không
        new_start_date = start_date + timedelta(days=days_shift)
        new_end_date = end_date + timedelta(days=days_shift)
        
        conflict_check_query = text("""
            SELECT COUNT(*) as count
            FROM daily_branch_metrics 
            WHERE branch_id = :branch_id 
            AND report_date >= :new_start_date 
            AND report_date <= :new_end_date
        """)
        
        conflict_result = db.execute(
            conflict_check_query,
            {
                "branch_id": branch_id,
                "new_start_date": new_start_date,
                "new_end_date": new_end_date
            }
        )
        
        conflict_count = conflict_result.fetchone()[0]
        if conflict_count > 0:
            logger.warning(f"\n⚠️  CẢNH BÁO: Có {conflict_count} records đã tồn tại trong range mới ({new_start_date} đến {new_end_date})")
            logger.warning("Script sẽ sử dụng phương pháp 2 bước để tránh xung đột.")
        
        # Nếu là dry_run, chỉ hiển thị thông tin
        if dry_run:
            logger.info("\n=== DRY RUN MODE ===")
            logger.info("Chưa thực hiện cập nhật. Để thực hiện cập nhật, chạy với --execute")
            db.close()
            return
        
        # Thực hiện cập nhật theo 2 bước để tránh duplicate key error
        # Bước 1: Dịch chuyển tạm thời lên một giá trị lớn (tránh conflict)
        # Bước 2: Dịch chuyển về giá trị cuối cùng
        logger.info("\n=== BẮT ĐẦU CẬP NHẬT ===")
        
        # Bước 1: Dịch chuyển tạm thời lên 10000 ngày (tránh conflict với dữ liệu hiện có)
        temp_shift = 10000
        logger.info(f"Bước 1: Dịch chuyển tạm thời lên {temp_shift} ngày...")
        update_query_temp = text("""
            UPDATE daily_branch_metrics 
            SET report_date = DATE_ADD(report_date, INTERVAL :temp_shift DAY)
            WHERE branch_id = :branch_id 
            AND report_date >= :start_date 
            AND report_date <= :end_date
        """)
        
        result_temp = db.execute(
            update_query_temp,
            {
                "branch_id": branch_id,
                "start_date": start_date,
                "end_date": end_date,
                "temp_shift": temp_shift
            }
        )
        db.commit()
        logger.info(f"  Đã dịch chuyển tạm thời {result_temp.rowcount} records")
        
        # Bước 2: Dịch chuyển về giá trị cuối cùng (trừ đi phần dư)
        final_shift = days_shift - temp_shift  # Ví dụ: 42 - 10000 = -9958
        logger.info(f"Bước 2: Dịch chuyển về giá trị cuối cùng ({final_shift} ngày)...")
        update_query_final = text("""
            UPDATE daily_branch_metrics 
            SET report_date = DATE_ADD(report_date, INTERVAL :final_shift DAY)
            WHERE branch_id = :branch_id 
            AND report_date >= DATE_ADD(:start_date, INTERVAL :temp_shift DAY)
            AND report_date <= DATE_ADD(:end_date, INTERVAL :temp_shift DAY)
        """)
        
        result_final = db.execute(
            update_query_final,
            {
                "branch_id": branch_id,
                "start_date": start_date,
                "end_date": end_date,
                "temp_shift": temp_shift,
                "final_shift": final_shift
            }
        )
        db.commit()
        updated_count = result_final.rowcount
        logger.info(f"Đã cập nhật thành công {updated_count} records!")
        
        # Kiểm tra lại kết quả
        verify_query = text("""
            SELECT COUNT(*) as count, 
                   MIN(report_date) as min_date, 
                   MAX(report_date) as max_date
            FROM daily_branch_metrics 
            WHERE branch_id = :branch_id 
            AND report_date >= :new_start_date 
            AND report_date <= :new_end_date
        """)
        
        new_start_date = start_date + timedelta(days=days_shift)
        new_end_date = end_date + timedelta(days=days_shift)
        
        verify_result = db.execute(
            verify_query,
            {
                "branch_id": branch_id,
                "new_start_date": new_start_date,
                "new_end_date": new_end_date
            }
        )
        
        verify_data = verify_result.fetchone()
        logger.info(f"\n=== KẾT QUẢ SAU CẬP NHẬT ===")
        logger.info(f"Số records trong range mới: {verify_data[0]}")
        logger.info(f"Ngày nhỏ nhất: {verify_data[1]}")
        logger.info(f"Ngày lớn nhất: {verify_data[2]}")
        
        db.close()
        logger.info("\n=== HOÀN TẤT ===")
        
    except Exception as e:
        logger.error(f"Lỗi khi cập nhật: {e}", exc_info=True)
        if 'db' in locals():
            db.rollback()
            db.close()
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Cập nhật report_date trong daily_branch_metrics")
    parser.add_argument(
        "--branch-id",
        type=int,
        default=2,
        help="ID chi nhánh (mặc định: 2, hỗ trợ: 2, 10)"
    )
    parser.add_argument(
        "--start-date",
        type=str,
        help="Ngày bắt đầu range cần cập nhật (format: YYYY-MM-DD, optional nếu branch có config)"
    )
    parser.add_argument(
        "--end-date",
        type=str,
        help="Ngày kết thúc range cũ (format: YYYY-MM-DD, optional nếu branch có config)"
    )
    parser.add_argument(
        "--new-end-date",
        type=str,
        help="Ngày kết thúc mới (format: YYYY-MM-DD, optional nếu branch có config)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Thực hiện cập nhật (mặc định: dry-run mode)"
    )
    
    args = parser.parse_args()
    
    # Chạy với dry_run=False nếu có flag --execute
    update_report_dates(
        branch_id=args.branch_id,
        start_date_str=args.start_date,
        end_date_str=args.end_date,
        new_end_date_str=args.new_end_date,
        dry_run=not args.execute
    )


"""
Script để import dữ liệu từ daily_metrics.csv vào bảng daily_branch_metrics

Logic:
1. Đọc CSV từ daily_metrics.csv
2. Map ngày: dòng cuối (2018-10-17) -> 08/11/2025, các dòng trước đó sẽ là các ngày trước đó
3. Convert UUID (top_selling_product_id) sang INT (với mapping để giữ consistency)
4. Insert vào database
"""
import os
import sys
import json
import pandas as pd
from datetime import date, datetime, timedelta
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.infrastructure.database.connection import DatabaseConnection
from src.infrastructure.repositories.metrics_repository_impl import MetricsRepositoryImpl
from src.domain.entities.metrics import DailyBranchMetrics


def load_uuid_mapping(mapping_file: Path) -> dict:
    """Load UUID mapping từ file nếu có"""
    if mapping_file.exists():
        with open(mapping_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_uuid_mapping(mapping: dict, mapping_file: Path):
    """Lưu UUID mapping vào file"""
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)


def create_uuid_to_int_mapping(df: pd.DataFrame, mapping_file: Path) -> dict:
    """
    Tạo mapping từ UUID sang INT cho top_selling_product_id
    - Nếu UUID đã có trong mapping file thì dùng ID cũ
    - Nếu chưa có thì tạo ID mới theo thứ tự (1, 2, 3, ...)
    """
    # Load mapping cũ
    uuid_to_int = load_uuid_mapping(mapping_file)
    
    # Tìm ID lớn nhất hiện có (để tiếp tục đánh số)
    max_id = max(uuid_to_int.values()) if uuid_to_int else 0
    next_id = max_id + 1
    
    # Lấy tất cả UUID trong CSV (theo thứ tự xuất hiện)
    # Dùng drop_duplicates(keep='first') để giữ thứ tự
    unique_uuids = df['top_selling_product_id'].dropna().drop_duplicates(keep='first')
    new_uuids = []
    
    for uuid in unique_uuids:
        if pd.isna(uuid) or uuid == '':
            continue
        
        uuid_str = str(uuid)
        
        # Nếu UUID chưa có trong mapping, tạo ID mới
        if uuid_str not in uuid_to_int:
            uuid_to_int[uuid_str] = next_id
            new_uuids.append((uuid_str, next_id))
            next_id += 1
    
    # Lưu mapping mới
    if new_uuids:
        save_uuid_mapping(uuid_to_int, mapping_file)
        print(f"   ✅ Đã thêm {len(new_uuids)} UUID mới vào mapping:")
        print(f"      Ví dụ: {new_uuids[0][0][:20]}... -> {new_uuids[0][1]}")
        if len(new_uuids) > 1:
            print(f"      ... và {len(new_uuids)-1} UUID khác")
    
    print(f"✅ Tổng số UUID trong mapping: {len(uuid_to_int)}")
    return uuid_to_int


def map_dates_reverse(df: pd.DataFrame, target_end_date: date) -> pd.DataFrame:
    """
    Map ngày từ CSV về target_end_date trở về trước
    Dòng cuối cùng trong CSV sẽ là target_end_date
    """
    df = df.copy()
    df['report_date'] = pd.to_datetime(df['report_date'], errors='coerce')
    
    # Sắp xếp theo ngày tăng dần (để dòng cuối là ngày mới nhất)
    df = df.sort_values('report_date').reset_index(drop=True)
    
    # Dòng cuối cùng sẽ là target_end_date
    last_row_idx = len(df) - 1
    last_csv_date = df.iloc[last_row_idx]['report_date'].date()
    
    # Tính số ngày chênh lệch
    days_diff = (target_end_date - last_csv_date).days
    
    # Map tất cả các ngày
    df['mapped_date'] = df['report_date'].apply(
        lambda x: (x.date() + timedelta(days=days_diff)) if pd.notna(x) else None
    )
    
    print(f"📅 Map ngày:")
    print(f"   CSV cuối: {last_csv_date} -> DB: {target_end_date}")
    print(f"   CSV đầu: {df.iloc[0]['report_date'].date()} -> DB: {df.iloc[0]['mapped_date']}")
    print(f"   CSV cuối: {df.iloc[-1]['report_date'].date()} -> DB: {df.iloc[-1]['mapped_date']}")
    print(f"   Chênh lệch: {days_diff} ngày")
    
    # Verify: kiểm tra một vài ngày ở giữa
    if len(df) > 5:
        mid_idx = len(df) // 2
        print(f"   CSV giữa: {df.iloc[mid_idx]['report_date'].date()} -> DB: {df.iloc[mid_idx]['mapped_date']}")
    
    return df


def convert_row_to_entity(row: pd.Series, branch_id: int, uuid_to_int: dict) -> DailyBranchMetrics:
    """Convert CSV row thành DailyBranchMetrics entity"""
    
    # Convert top_selling_product_id từ UUID sang INT
    top_product_uuid = row.get('top_selling_product_id')
    top_product_id = None
    if pd.notna(top_product_uuid) and top_product_uuid != '':
        uuid_str = str(top_product_uuid)
        top_product_id = uuid_to_int.get(uuid_str)
        
        # Validation: đảm bảo UUID đã có trong mapping
        if top_product_id is None:
            raise ValueError(f"UUID '{uuid_str}' không có trong mapping! Cần tạo mapping trước.")
    
    # Convert các giá trị
    def safe_int(val):
        if pd.isna(val):
            return None
        try:
            return int(val)
        except:
            return None
    
    def safe_float(val):
        if pd.isna(val):
            return None
        try:
            return float(val)
        except:
            return None
    
    def safe_bool(val):
        if pd.isna(val):
            return None
        try:
            return bool(int(val))
        except:
            return None
    
    # Lấy mapped_date (ngày đã được map)
    mapped_date = row['mapped_date']
    
    # Tính lại day_of_week và is_weekend dựa trên mapped_date mới
    if mapped_date:
        # day_of_week: 1=Monday, 7=Sunday (ISO format)
        day_of_week = mapped_date.isoweekday()
        # is_weekend: True nếu là Saturday (6) hoặc Sunday (7)
        is_weekend = day_of_week >= 6
    else:
        # Fallback: dùng giá trị từ CSV nếu không có mapped_date
        day_of_week = safe_int(row.get('day_of_week'))
        is_weekend = safe_bool(row.get('is_weekend'))
    
    return DailyBranchMetrics(
        branch_id=branch_id,
        report_date=mapped_date,
        total_revenue=safe_float(row.get('total_revenue')),
        order_count=safe_int(row.get('order_count')),
        avg_order_value=safe_float(row.get('avg_order_value')),
        customer_count=safe_int(row.get('customer_count')),
        repeat_customers=safe_int(row.get('repeat_customers')),
        new_customers=safe_int(row.get('new_customers')),
        unique_products_sold=safe_int(row.get('unique_products_sold')),
        top_selling_product_id=top_product_id,
        product_diversity_score=safe_float(row.get('product_diversity_score')),
        peak_hour=safe_int(row.get('peak_hour')),
        day_of_week=day_of_week,  # Tính lại từ mapped_date
        is_weekend=is_weekend,     # Tính lại từ mapped_date
        avg_review_score=safe_float(row.get('avg_review_score')),
        # Các trường không có trong CSV sẽ là None
        avg_preparation_time_seconds=None,
        staff_efficiency_score=None,
        material_cost=None,
        waste_percentage=None,
        low_stock_products=None,
        out_of_stock_products=None
    )


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Import daily_metrics.csv vào database")
    parser.add_argument("--csv", dest="csv_path", 
                       default="clean_data/daily_metrics.csv",
                       help="Đường dẫn đến file CSV")
    parser.add_argument("--branch-id", dest="branch_id", type=int, default=1,
                       help="ID chi nhánh (mặc định: 1)")
    parser.add_argument("--target-date", dest="target_date", 
                       default="2025-11-08",
                       help="Ngày cuối cùng (dòng cuối CSV sẽ map về ngày này, format: YYYY-MM-DD)")
    parser.add_argument("--dry-run", action="store_true",
                       help="Chỉ hiển thị thông tin, không insert vào DB")
    parser.add_argument("--mapping-file", dest="mapping_file",
                       default="uuid_to_int_mapping.json",
                       help="File lưu mapping UUID -> INT (mặc định: uuid_to_int_mapping.json)")
    
    args = parser.parse_args()
    
    # Mapping file path
    mapping_file = Path(args.mapping_file)
    
    # Parse target date
    try:
        target_end_date = datetime.strptime(args.target_date, "%Y-%m-%d").date()
    except ValueError:
        print(f"❌ Invalid date format: {args.target_date}. Use YYYY-MM-DD")
        sys.exit(1)
    
    # Đọc CSV
    csv_path = Path(args.csv_path)
    if not csv_path.exists():
        print(f"❌ File không tồn tại: {csv_path}")
        sys.exit(1)
    
    print(f"📖 Đọc CSV: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"   Tổng số dòng: {len(df)}")
    
    # Tạo UUID mapping
    print(f"\n🔑 Tạo UUID to INT mapping (file: {mapping_file})...")
    uuid_to_int = create_uuid_to_int_mapping(df, mapping_file)
    
    # Kiểm tra: đảm bảo tất cả UUID trong CSV đều có trong mapping
    all_uuids = df['top_selling_product_id'].dropna().unique()
    missing_uuids = [str(uuid) for uuid in all_uuids if str(uuid) not in uuid_to_int and str(uuid) != '']
    if missing_uuids:
        print(f"⚠️  Cảnh báo: Có {len(missing_uuids)} UUID không có trong mapping!")
        print(f"   Ví dụ: {missing_uuids[0]}")
    else:
        print(f"✅ Tất cả UUID trong CSV đều có trong mapping")
    
    # Map ngày
    print("\n📅 Map ngày...")
    df = map_dates_reverse(df, target_end_date)
    
    # Kết nối DB
    if not args.dry_run:
        print("\n🔌 Kết nối database...")
        db = DatabaseConnection()
        try:
            db.connect()
            print("✅ Kết nối thành công")
        except Exception as e:
            print(f"❌ Lỗi kết nối database: {e}")
            sys.exit(1)
        
        metrics_repo = MetricsRepositoryImpl(db)
    else:
        print("\n⚠️  DRY RUN mode - không insert vào DB")
        db = None
        metrics_repo = None
    
    # Import từng dòng
    print(f"\n📥 Import dữ liệu (branch_id={args.branch_id})...")
    success_count = 0
    error_count = 0
    
    for idx, row in df.iterrows():
        try:
            # Convert row to entity
            entity = convert_row_to_entity(row, args.branch_id, uuid_to_int)
            
            if args.dry_run:
                # Hiển thị tất cả các giá trị có thể lưu
                print(f"\n   [{idx+1}/{len(df)}] {entity.report_date}:")
                print(f"      Revenue: {entity.total_revenue}, Orders: {entity.order_count}, AOV: {entity.avg_order_value}")
                print(f"      Customers: {entity.customer_count} (new: {entity.new_customers}, repeat: {entity.repeat_customers})")
                print(f"      Products: unique={entity.unique_products_sold}, top_id={entity.top_selling_product_id}, diversity={entity.product_diversity_score}")
                print(f"      Time: peak_hour={entity.peak_hour}, dow={entity.day_of_week}, weekend={entity.is_weekend}")
                print(f"      Review: {entity.avg_review_score}")
                
                # Chỉ hiển thị 10 dòng đầu để không quá dài
                if idx + 1 >= 10:
                    print(f"\n   ... (chỉ hiển thị 10 dòng đầu, tổng cộng {len(df)} dòng)")
                    break
            else:
                # Insert vào DB
                metric_id = metrics_repo.save(entity)
                success_count += 1
                
                if (idx + 1) % 100 == 0:
                    print(f"   Đã import {idx + 1}/{len(df)} dòng...")
        
        except Exception as e:
            error_count += 1
            print(f"   ❌ Lỗi ở dòng {idx+1}: {e}")
            if not args.dry_run:
                import traceback
                traceback.print_exc()
    
    # Tổng kết
    print("\n" + "="*60)
    print("📊 TỔNG KẾT")
    print("="*60)
    print(f"   Tổng số dòng: {len(df)}")
    if not args.dry_run:
        print(f"   ✅ Thành công: {success_count}")
        print(f"   ❌ Lỗi: {error_count}")
        if db:
            db.disconnect()
    else:
        print(f"   (DRY RUN - không có dữ liệu được insert)")
    print("="*60)


if __name__ == "__main__":
    main()


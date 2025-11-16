"""
Database connection utility
"""
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()


class DatabaseConnection:
    """Quản lý kết nối đến analytics_db"""
    
    def __init__(self, database_name: str = None):
        """
        Khởi tạo kết nối database
        
        Args:
            database_name: Tên database (mặc định: analytics_db hoặc từ TOOL2_DB_NAME env var)
                          Nếu không truyền, sẽ ưu tiên TOOL2_DB_NAME, sau đó DB_NAME, cuối cùng là analytics_db
        """
        self.connection = None
        host_env = os.getenv('DB_HOST', 'localhost')
        host = '127.0.0.1' if host_env.strip().lower() == 'localhost' else host_env
        
        # Xác định database name: ưu tiên tham số > TOOL2_DB_NAME > DB_NAME > analytics_db
        if database_name:
            db_name = database_name
        else:
            db_name = os.getenv('TOOL2_DB_NAME') or os.getenv('DB_NAME', 'analytics_db')
        
        self.config = {
            'host': host,
            'port': int(os.getenv('DB_PORT', 3306)),
            'database': db_name,
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
            'connection_timeout': int(os.getenv('DB_CONNECTION_TIMEOUT', 10)),
            'use_pure': True,
            'auth_plugin': os.getenv('DB_AUTH_PLUGIN', 'mysql_native_password'),
        }
    
    def connect(self):
        """Kết nối đến database"""
        try:
            self.connection = mysql.connector.connect(**self.config)
            if self.connection.is_connected():
                return True
            raise ConnectionError("Connection established but not active")
        except Error as e:
            raise ConnectionError(f"Lỗi kết nối database: {e} (errno: {getattr(e, 'errno', 'N/A')})")
        except Exception as e:
            raise ConnectionError(f"Lỗi kết nối database (unexpected): {type(e).__name__}: {e}")
    
    def disconnect(self):
        """Đóng kết nối"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
    
    def get_connection(self):
        """Lấy connection object"""
        if not self.connection or not self.connection.is_connected():
            self.connect()
        return self.connection
    
    def execute_query(self, query, params=None, fetch=True):
        """Thực thi query và trả về kết quả"""
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            result = cursor.fetchall() if fetch else cursor.lastrowid
            self.connection.commit()
            cursor.close()
            return result
        except Error as e:
            self.connection.rollback()
            raise RuntimeError(f"Lỗi thực thi query: {e}")
    
    def __enter__(self):
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()


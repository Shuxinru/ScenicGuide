from sqlalchemy import Column, Integer, String, Text, Date, DECIMAL
from app.core.database import Base


class TouristBehavior(Base):
    __tablename__ = "tourist_behavior"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tourist_id = Column(String(20))
    user_nickname = Column(String(50))
    age = Column(Integer)
    gender = Column(String(10))
    attraction_name = Column(String(100))
    attraction_content = Column(Text)
    visit_date = Column(Date)
    stay_duration = Column(DECIMAL(10, 2))
    ticket_cost = Column(DECIMAL(10, 2))
    food_cost = Column(DECIMAL(10, 2))
    shopping_cost = Column(DECIMAL(10, 2))
    transport_cost = Column(DECIMAL(10, 2))
    entertainment_cost = Column(DECIMAL(10, 2))
    total_cost = Column(DECIMAL(10, 2))
    attraction_type = Column(String(50))
    group_size = Column(Integer)
    satisfaction = Column(Integer)

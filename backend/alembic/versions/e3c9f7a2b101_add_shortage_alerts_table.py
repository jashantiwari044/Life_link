"""add shortage alerts table

Revision ID: e3c9f7a2b101
Revises: d2b8e5f14a77
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e3c9f7a2b101'
down_revision: Union[str, None] = 'd2b8e5f14a77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'shortage_alerts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('blood_bank_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('blood_group', sa.String(), nullable=False),
        sa.Column('units_needed', sa.Integer(), nullable=False),
        sa.Column('urgency', sa.String(), nullable=False, server_default='HIGH'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('shortage_alerts')
